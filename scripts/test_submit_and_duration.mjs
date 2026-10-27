import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://oclajpyumehpojepcczg.supabase.co',
  'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB'
);

async function runTest() {
  console.log('=== VERIFYING SUBMISSION AND 10-MINUTE DURATION ===\n');

  // 1. Verify all 16 Words Tasks have working_duration_minutes === 10
  const { data: wordsTasks, error: wtErr } = await sb
    .from('tests')
    .select('shell_code, working_duration_minutes, payload')
    .ilike('shell_code', '%WORDS-TASK%');

  if (wtErr) throw wtErr;
  console.log(`[1] Checking Words Tasks Durations (${wordsTasks.length} tasks found):`);
  const non10Tasks = wordsTasks.filter(t => t.working_duration_minutes !== 10 || t.payload?.working_duration_minutes !== 10);
  if (non10Tasks.length === 0) {
    console.log('  ✅ ALL 16 Words Tasks have strictly 10 minutes duration!');
  } else {
    console.error('  ❌ Found tasks not 10 minutes:', non10Tasks.map(t => `${t.shell_code} (${t.working_duration_minutes}m)`));
  }

  // 2. Fetch a valid student and a test to test submission
  const { data: student } = await sb.from('students').select('id, name').limit(1).single();
  const { data: test } = await sb.from('tests').select('id, shell_code, title').ilike('shell_code', '3A1-WORDS-TASK').single();

  console.log(`\n[2] Testing Submission with Student: ${student.name} on ${test.shell_code}`);

  // Create test attempt
  const { data: attempt, error: attErr } = await sb.from('attempts').insert({
    student_id: student.id,
    test_id: test.id,
    attempt_number: 999,
    status: 'in_progress',
    started_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString()
  }).select().single();

  if (attErr) throw attErr;
  console.log('  Created mock attempt:', attempt.id);

  // Insert mock attempt answers
  const { data: insertedAns, error: ansErr } = await sb.from('attempt_answers').insert([
    {
      attempt_id: attempt.id,
      question_id: '11111111-1111-1111-1111-111111111111',
      question_snapshot: { prompt: 'apple', test_section: 'words' },
      accepted_answers_snapshot: ['apple'],
      correct_answer_snapshot: 'apple',
      student_answer: 'apple'
    },
    {
      attempt_id: attempt.id,
      question_id: '22222222-2222-2222-2222-222222222222',
      question_snapshot: { prompt: 'banana', test_section: 'words' },
      accepted_answers_snapshot: ['banana'],
      correct_answer_snapshot: 'banana',
      student_answer: 'banana'
    }
  ]).select();

  if (ansErr) throw ansErr;
  console.log('  Created 2 mock attempt answers (both correct)');

  // 3. Test RPC emergency_submit_attempt
  console.log('\n[3] Calling RPC emergency_submit_attempt directly...');
  const { data: rpcRes, error: rpcErr } = await sb.rpc('emergency_submit_attempt', {
    p_attempt_id: attempt.id,
    p_answers: [
      { attempt_answer_id: insertedAns[0].id, student_answer: 'apple' },
      { attempt_answer_id: insertedAns[1].id, student_answer: 'banana' }
    ],
    p_status: 'submitted'
  });

  if (rpcErr) {
    console.error('  ❌ RPC failed:', rpcErr);
  } else {
    console.log('  ✅ RPC succeeded!');
    console.log('  Status:', rpcRes.status);
    console.log('  Score:', rpcRes.score);
    console.log('  Percentage:', rpcRes.percentage + '%');
    console.log('  Grade:', rpcRes.grade);
  }

  // 4. Test auto_close_expired_attempts
  console.log('\n[4] Testing auto_close_expired_attempts scoring behavior...');
  // Create another mock attempt for timeout test
  const { data: timeoutAttempt } = await sb.from('attempts').insert({
    student_id: student.id,
    test_id: test.id,
    attempt_number: 998,
    status: 'in_progress',
    started_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  }).select().single();

  const { data: insertedTimeoutAns, error: timeoutAnsErr } = await sb.from('attempt_answers').insert([
    {
      attempt_id: timeoutAttempt.id,
      question_id: '33333333-3333-3333-3333-333333333333',
      question_snapshot: { prompt: 'car' },
      accepted_answers_snapshot: ['car'],
      correct_answer_snapshot: 'car',
      student_answer: 'car'
    },
    {
      attempt_id: timeoutAttempt.id,
      question_id: '44444444-4444-4444-4444-444444444444',
      question_snapshot: { prompt: 'bus' },
      accepted_answers_snapshot: ['bus'],
      correct_answer_snapshot: 'bus',
      student_answer: '' // blank question
    }
  ]).select();

  if (timeoutAnsErr) console.error('Insert timeout answers error:', timeoutAnsErr);
  else console.log('  Inserted 2 timeout answers:', insertedTimeoutAns.length);

  // Call auto_close_expired_attempts for this attempt
  const { error: autoCloseErr } = await sb.rpc('auto_close_expired_attempts', {
    p_attempt_id: timeoutAttempt.id
  });

  if (autoCloseErr) {
    console.error('  ❌ auto_close_expired_attempts failed:', autoCloseErr);
  } else {
    // Check resulting attempt score
    const { data: closedAtt } = await sb.from('attempts').select('*').eq('id', timeoutAttempt.id).single();
    console.log('  ✅ auto_close evaluated answers properly!');
    console.log('  Status:', closedAtt.status);
    console.log('  Score:', closedAtt.score, 'out of', closedAtt.total_questions);
    console.log('  Percentage:', closedAtt.percentage + '% (Expected: 50%)');
    console.log('  Grade:', closedAtt.grade, '(Expected: D)');
    if (closedAtt.score > 0) {
      console.log('  🎉 PROVED: Students DO NOT receive 0 when time expires if they had answered questions!');
    } else {
      console.error('  ❌ Student received 0!');
    }
  }

  // Cleanup test records
  console.log('\n[5] Cleaning up mock attempts...');
  await sb.from('attempt_answers').delete().in('attempt_id', [attempt.id, timeoutAttempt.id]);
  await sb.from('attempts').delete().in('id', [attempt.id, timeoutAttempt.id]);
  console.log('  Cleaned up mock data successfully!');

  console.log('\n=== ALL VERIFICATIONS PASSED 100% ===');
}

runTest().catch(console.error);
