import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkScores() {
  const { data: batches } = await sb.from('batches').select('id').eq('name', '133').is('deleted_at', null);
  const { data: students } = await sb.from('students')
    .select('id, name')
    .eq('batch_id', batches[0].id)
    .is('deleted_at', null)
    .order('name');

  const studentIds = students.map(s => s.id);
  const { data: attempts } = await sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, status, total_questions, is_remedial_unlocked')
    .in('student_id', studentIds);

  console.log(`Total Batch 133 Students: ${students.length}`);
  console.log(`Total Attempts: ${attempts.length}`);

  let totalZeroAuto = 0;
  students.forEach(s => {
    const sAtts = attempts.filter(a => a.student_id === s.id);
    const scored = sAtts.filter(a => a.score > 0);
    const zeroAuto = sAtts.filter(a => a.status === 'auto_submitted' && a.score === 0);
    totalZeroAuto += zeroAuto.length;
    console.log(`${s.name.padEnd(28)} | Total: ${sAtts.length.toString().padStart(3)} | Scored: ${scored.length.toString().padStart(2)} | Zero-Auto: ${zeroAuto.length}`);
  });
  console.log(`\nTotal auto-closed score 0 attempts across Batch 133: ${totalZeroAuto}`);
}

checkScores();
