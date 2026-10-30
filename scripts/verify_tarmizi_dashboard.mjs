import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== VERIFYING TARMIZI DASHBOARD CALCULATION IN NODE ===\n');

const { data: students, error: sErr } = await supabase.from('students').select('*').ilike('name', '%Tarmizi%');
if (sErr) console.error('Student query error:', sErr);
const student = students.find(s => s.name.includes('Mr.')) || students[0];
console.log('Student:', student.name, 'ID:', student.id);

const { data: attempts, error: aErr } = await supabase
  .from('attempts')
  .select('id, test_id, score, percentage, status, created_at, submitted_at, total_questions, is_remedial_unlocked, tests(id, title, test_type, shell_code, payload)')
  .eq('student_id', student.id);

if (aErr) {
  console.error('Attempts query error:', aErr);
  process.exit(1);
}

console.log(`Loaded ${attempts.length} attempts.`);

// Run the exact loop from dashboard.js lines 1890-1925
const allBestMap = {};
const examBestMap = {};

function isExam(t) {
  if (!t) return false;
  return (t.test_type === 'exam' || t.category === 'EXAM' || String(t.shell_code || '').includes('-EXAM') || String(t.title || '').toLowerCase().includes('exam'));
}

attempts.forEach(att => {
  if (att.tests && att.tests.deleted_at) return;
  const uniqueKey = att.test_instance_id || att.test_id || att.Test_id;
  if (!uniqueKey) return;
  const asm = att.tests;
  if (asm?.deleted_at) return;

  const rawPct = parseFloat(att.percentage || 0);
  const isRem = Boolean(att.is_remedial_unlocked);
  const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
  const attTime = new Date(att.submitted_at || att.created_at || 0).getTime();

  if (allBestMap[uniqueKey] == null || effPct > allBestMap[uniqueKey]) {
    allBestMap[uniqueKey] = effPct;
  }

  if (isExam(asm)) {
    const totalQ = Number(att.total_questions || asm?.total_questions || asm?.payload?.total_questions || 50);
    const rawScore = Number(att.score ?? 0);
    const maxRemPts = totalQ * 0.6;
    const effPoints = isRem ? Math.min(rawScore, maxRemPts) : rawScore;
    const curPts = examBestMap[uniqueKey]?.effPoints ?? -1;
    const curPct = examBestMap[uniqueKey]?.effPct ?? -1;
    const curTime = examBestMap[uniqueKey]?.attTime || 0;
    if (examBestMap[uniqueKey] == null || effPoints > curPts || (effPoints === curPts && effPct > curPct) || (effPoints === curPts && attTime > curTime)) {
      examBestMap[uniqueKey] = { effPct, effPoints, totalQ, test: asm, testId: uniqueKey, attTime };
    }
  }
});

console.log('✓ Successfully executed attempts loop without ReferenceError!');
console.log('examBestMap keys count:', Object.keys(examBestMap).length);
Object.entries(examBestMap).forEach(([k, v]) => {
  console.log(`  * ${v.test?.shell_code} (${v.test?.title}): ${v.effPoints}/${v.totalQ} pts (${v.effPct}%)`);
});

const completedCount = Object.keys(allBestMap).filter(k => !k.endsWith('_locked')).length;
console.log(`Total completed activities: ${completedCount}`);
console.log('\n=== DASHBOARD LOGIC EXECUTES 100% CLEANLY! ===');
