import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const batchId = '3e7288b7-a90e-4323-9b02-24e73991f0d7';
  
  const { data: students } = await sb.from('students').select('id, name').eq('batch_id', batchId).order('name');
  const stuIds = students.map(s => s.id);

  const examAId = '9d079ecc-bc73-4d38-a5ea-2772fda350dc'; // 2A-WORDS-EXAM
  const examBId = '90308450-e456-4070-9e55-96ce2c26fa31'; // 2B-WORDS-EXAM

  const { data: atts } = await sb.from('attempts')
    .select('student_id, test_id, percentage, effective_score, status, is_forgiven, started_at')
    .in('student_id', stuIds)
    .in('test_id', [examAId, examBId]);

  console.log('=== ATTEMPTS ON THEME A & B EXAMS IN BATCH 134 ===');
  students.forEach(s => {
    const sAtts = (atts || []).filter(a => a.student_id === s.id);
    const aAtt = sAtts.find(a => a.test_id === examAId);
    const bAtt = sAtts.find(a => a.test_id === examBId);
    
    const aStatus = aAtt ? `${aAtt.percentage}% (status: ${aAtt.status}, forgiven: ${aAtt.is_forgiven})` : 'NO ATTEMPT';
    const bStatus = bAtt ? `${bAtt.percentage}% (status: ${bAtt.status}, forgiven: ${bAtt.is_forgiven})` : 'NO ATTEMPT';
    
    console.log(`${s.name}:`);
    console.log(`   Theme A Exam (2A): ${aStatus}`);
    console.log(`   Theme B Exam (2B): ${bStatus}`);
  });
}
main().catch(console.error);
