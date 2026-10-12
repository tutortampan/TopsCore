import { getSupabase } from './js/supabase.js';

async function testUpdate() {
  const sb = getSupabase();
  const batchId = '919d3f10-db05-47eb-baad-0a6dd24b17a1'; // random or valid batchId? Let me just pick one
  const { data: batch } = await sb.from('batches').select('id').limit(1).single();
  const { data: level } = await sb.from('levels').select('id').limit(1).single();

  if(!batch || !level) return console.log('no batch or level');

  const { error: batchErr } = await sb.from('batches').update({ current_level_id: level.id }).eq('id', batch.id);
  console.log('Batch Err:', batchErr);
  
  const { error: stuErr } = await sb.from('students').update({ level_id: level.id }).eq('batch_id', batch.id);
  console.log('Stu Err:', stuErr);
}

testUpdate().catch(console.error);
