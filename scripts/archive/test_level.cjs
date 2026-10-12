const { createClient } = require('@supabase/supabase-js');
const { readFileSync } = require('fs');

function getAnonKey() {
  const content = readFileSync('js/supabase.js', 'utf8');
  const match = content.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
  return match ? match[1] : null;
}

const url = 'http://127.0.0.1:54321';
const key = getAnonKey();
const sb = createClient(url, key);

async function testUpdate() {
  const { data: batch } = await sb.from('batches').select('id').limit(1).single();
  const { data: level } = await sb.from('levels').select('id').limit(1).single();

  if(!batch || !level) return console.log('no batch or level');

  const { error: batchErr } = await sb.from('batches').update({ current_level_id: level.id }).eq('id', batch.id);
  console.log('Batch Err:', batchErr);
  
  const { error: stuErr } = await sb.from('students').update({ level_id: level.id }).eq('batch_id', batch.id);
  console.log('Stu Err:', stuErr);
}

testUpdate().catch(console.error);
