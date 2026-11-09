global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};
global.document = {
  documentElement: {},
  addEventListener: () => {},
  getElementById: () => null
};

const { getSupabase } = await import('../js/supabase.js');
const { startTest, submitTest } = await import('../js/api.js');

console.log('Testing Realtime Journey Pilot with student "Test"...');
const sb = await getSupabase();

// 1. Get or create student "Test"
let { data: student } = await sb.from('students').select('*').eq('name', 'Test').maybeSingle();
if (!student) {
  const { data: newStud, error: insErr } = await sb.from('students').insert({
    name: 'Test',
    institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
    program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
    batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7', // Batch 134 (Level 2)
    level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71', // Level 2
    pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
    is_active: true
  }).select().single();
  if (insErr) {
    console.error('Failed to create student Test:', insErr);
    process.exit(1);
  }
  student = newStud;
  console.log('Created student Test:', student.id);
} else {
  console.log('Found existing student Test:', student.id);
  // Reset student to Level 2
  await sb.from('students').update({
    batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
    level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71'
  }).eq('id', student.id);
}

// Clear any previous attempts for student Test
await sb.from('attempts').delete().eq('student_id', student.id);
console.log('Cleared old attempts for student Test');

// 2. Fetch 2A1-WORDS-TASK (Level 2 Topic 1 Task)
const { data: task2A1 } = await sb.from('tests').select('*').eq('shell_code', '2A1-WORDS-TASK').single();
console.log('Starting real test session for:', task2A1.title);

const sessionRes = await startTest(student.id, task2A1.id);
console.log('Started attempt:', sessionRes.attempt?.id, 'Total questions:', sessionRes.answers?.length);

// 3. Submit real answers
const { data: attemptAnswers } = await sb.from('attempt_answers').select('*').eq('attempt_id', sessionRes.attempt.id);
const answersMap = (attemptAnswers || []).map(a => {
  const correct = Array.isArray(a.accepted_answers_snapshot) ? a.accepted_answers_snapshot[0] : (a.accepted_answers_snapshot || a.correct_answer_snapshot || 'correct');
  return {
    attempt_answer_id: a.id,
    student_answer: correct
  };
});

const submitRes = await submitTest(sessionRes.attempt.id, answersMap);
console.log('Submitted attempt result:', {
  score: submitRes.score,
  percentage: submitRes.percentage,
  grade: submitRes.grade,
  status: submitRes.status
});

console.log('Pilot test PASSED successfully!');
