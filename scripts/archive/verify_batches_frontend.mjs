import { createClient } from '@supabase/supabase-js';

const sb = createClient('https://oclajpyumehpojepcczg.supabase.co', 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB');

async function checkFrontendQuery() {
  const [b132, b134, levels] = await Promise.all([
    sb.from('students').select('id, name, is_active, level_id, batch_id').eq('batch_id', '2bb3f43a-d618-4f8a-9a98-31c157ff7a30').is('deleted_at', null),
    sb.from('students').select('id, name, is_active, level_id, batch_id').eq('batch_id', '3e7288b7-a90e-4323-9b02-24e73991f0d7').is('deleted_at', null),
    sb.from('levels').select('id, name, level_number')
  ]);

  const levelMap = new Map((levels.data || []).map(l => [l.id, l]));

  console.log('--- Batch 132 Frontend Query Simulation ---');
  console.log(`Found ${b132.data.length} students in Batch 132:`);
  for (const s of b132.data) {
    const lvl = levelMap.get(s.level_id);
    const isAlumni = lvl?.level_number === 0 || (lvl?.name || '').toLowerCase() === 'alumni';
    console.log(`- ${s.name}: is_active=${s.is_active}, level=${lvl?.name} (level_num=${lvl?.level_number}), isAlumni=${isAlumni}`);
  }

  console.log('\n--- Batch 134 Frontend Query Simulation ---');
  console.log(`Found ${b134.data.length} students in Batch 134:`);
  for (const s of b134.data) {
    const lvl = levelMap.get(s.level_id);
    const isAlumni = lvl?.level_number === 0 || (lvl?.name || '').toLowerCase() === 'alumni';
    console.log(`- ${s.name}: is_active=${s.is_active}, level=${lvl?.name} (level_num=${lvl?.level_number}), isAlumni=${isAlumni}`);
  }
}

checkFrontendQuery();
