import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const examBId = '90308450-e456-4070-9e55-96ce2c26fa31'; // 2B-WORDS-EXAM
  
  const { data: atts } = await sb.from('attempts')
    .select('id, student_id, percentage, effective_score, status, is_remedial, is_remedial_unlocked, is_forgiven, submitted_at, students(name)')
    .eq('test_id', examBId)
    .order('submitted_at', { ascending: false });

  console.log('=== THEME B EXAM ATTEMPTS (2B-WORDS-EXAM) ===');
  atts.forEach(a => {
    console.log(`${a.students?.name}: ${a.percentage}% | status: ${a.status} | remedial: ${a.is_remedial} | rem_unlocked: ${a.is_remedial_unlocked} | forgiven: ${a.is_forgiven} | submitted: ${a.submitted_at}`);
  });
}
main().catch(console.error);
