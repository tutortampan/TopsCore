// scripts/reset_test_student.mjs
// Clean reset of student account "Test" for fresh simulations, demos, or testing.

global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};

const { getSupabase } = await import('../js/supabase.js');
const sb = await getSupabase();

const INSTITUTION_ID = 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447'; // CEC
const PROGRAM_ID     = '11deb53c-434a-44b0-83ca-1cc9b239cab3'; // Camp
const LEVEL_2_ID     = '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71'; // 2nd Level
const BATCH_134_ID   = '3e7288b7-a90e-4323-9b02-24e73991f0d7'; // Level 2 Batch (Camp 134),btw
const PIN_1234_HASH  = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4'; // SHA-256 for "1234"

console.log('--- RESETTING STUDENT ACCOUNT "Test" ---');

// 1. Find student
let { data: student, error: stErr } = await sb.from('students').select('*').eq('name', 'Test').maybeSingle();
if (stErr) {
  console.error('Error fetching student Test:', stErr);
  process.exit(1);
}

if (!student) {
  console.log('Student "Test" not found. Creating fresh student record...');
  const { data: newStud, error: insErr } = await sb.from('students').insert({
    name: 'Test',
    institution_id: INSTITUTION_ID,
    program_id: PROGRAM_ID,
    batch_id: BATCH_134_ID,
    level_id: LEVEL_2_ID,
    pin_hash: PIN_1234_HASH,
    is_active: true
  }).select().single();

  if (insErr) {
    console.error('Failed to create student:', insErr);
    process.exit(1);
  }
  student = newStud;
  console.log('Created fresh student "Test":', student.id);
} else {
  console.log('Found student "Test":', student.id);
}

const studentId = student.id;

// 2. Fetch all attempts
const { data: attempts, error: attErr } = await sb
  .from('attempts')
  .select('id')
  .eq('student_id', studentId);

if (attErr) {
  console.error('Error fetching attempts:', attErr);
  process.exit(1);
}

const attemptIds = (attempts || []).map(a => a.id);
console.log(`Found ${attemptIds.length} attempts to remove.`);

// 3. Delete attempt_answers in chunks of 50
if (attemptIds.length > 0) {
  const chunkSize = 50;
  let deletedAnswers = 0;
  for (let i = 0; i < attemptIds.length; i += chunkSize) {
    const chunk = attemptIds.slice(i, i + chunkSize);
    const { count, error: delAnsErr } = await sb
      .from('attempt_answers')
      .delete({ count: 'exact' })
      .in('attempt_id', chunk);

    if (delAnsErr) {
      console.error(`Error deleting attempt_answers (chunk ${i}):`, delAnsErr);
    } else {
      deletedAnswers += (count || 0);
    }
  }
  console.log(`Deleted ${deletedAnswers} attempt answers.`);

  // 4. Delete attempts
  const { count: delAttCount, error: delAttErr } = await sb
    .from('attempts')
    .delete({ count: 'exact' })
    .eq('student_id', studentId);

  if (delAttErr) {
    console.error('Error deleting attempts:', delAttErr);
    process.exit(1);
  }
  console.log(`Deleted ${delAttCount || attemptIds.length} attempts.`);
}

// 5. Reset student status to Level 2 (Batch 134)
const { error: updErr } = await sb
  .from('students')
  .update({
    level_id: LEVEL_2_ID,
    batch_id: BATCH_134_ID,
    pin_hash: PIN_1234_HASH,
    is_active: true
  })
  .eq('id', studentId);

if (updErr) {
  console.error('Error updating student to initial state:', updErr);
  process.exit(1);
}

// 6. Verification
const { data: verifiedStudent } = await sb
  .from('students')
  .select('id, name, level_id, batch_id, is_active')
  .eq('id', studentId)
  .single();

const { count: remainingAttempts } = await sb
  .from('attempts')
  .select('id', { count: 'exact', head: true })
  .eq('student_id', studentId);

console.log('\n=== VERIFICATION RESULT ===');
console.log('Student ID:', verifiedStudent.id);
console.log('Student Name:', verifiedStudent.name);
console.log('Level ID (2nd Level):', verifiedStudent.level_id === LEVEL_2_ID ? '2nd Level (PASS)' : verifiedStudent.level_id);
console.log('Batch ID (Camp 134):', verifiedStudent.batch_id === BATCH_134_ID ? 'Camp 134 (PASS)' : verifiedStudent.batch_id);
console.log('Active Status:', verifiedStudent.is_active);
console.log('Remaining Attempts:', remainingAttempts);
console.log('Account "Test" is completely reset, clean, and ready for demo/testing!');

