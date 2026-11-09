// scripts/fix_batch_132_and_transfer_ariwil.mjs
import { createClient } from '@supabase/supabase-js';

const SUPABASE_CLOUD_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const sb = createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_ANON_KEY);

async function run() {
  console.log('1. Querying batches and students...');
  const { data: b132 } = await sb.from('batches').select('*').eq('name', '132').single();
  const { data: b134 } = await sb.from('batches').select('*').eq('name', '134').single();

  if (!b132 || !b134) {
    throw new Error('Batch 132 or Batch 134 not found!');
  }
  console.log(`   Batch 132 ID: ${b132.id}, current_level_id: ${b132.current_level_id}`);
  console.log(`   Batch 134 ID: ${b134.id}, current_level_id: ${b134.current_level_id}`);

  // Find Ariwil
  const { data: ariwilList, error: aErr } = await sb.from('students')
    .select('*')
    .ilike('name', '%ariwil%');
  if (aErr || !ariwilList || ariwilList.length === 0) {
    throw new Error('Student Ariwil not found!');
  }
  const ariwil = ariwilList[0];
  console.log(`2. Found Ariwil: ${ariwil.name} (${ariwil.id})`);

  // Transfer Ariwil to Batch 134 and inherit Batch 134's level
  const ariwilUpdates = {
    batch_id: b134.id,
    level_id: b134.current_level_id,
    is_active: true,
    updated_at: new Date().toISOString()
  };

  const { error: trErr } = await sb.from('students')
    .update(ariwilUpdates)
    .eq('id', ariwil.id);
  if (trErr) throw trErr;
  console.log(`   ✓ Ariwil successfully transferred to Batch 134 (Level: ${b134.current_level_id}, is_active: true).`);

  // Insert audit log for Ariwil transfer
  await sb.from('audit_logs').insert({
    actor_role: 'admin',
    action: 'STUDENT_BATCH_TRANSFER',
    entity_type: 'students',
    entity_id: ariwil.id,
    old_value: { batch_id: ariwil.batch_id, level_id: ariwil.level_id, is_active: ariwil.is_active },
    new_value: ariwilUpdates,
    created_at: new Date().toISOString()
  });
  console.log('   ✓ Audit log for transfer created.');

  // Fix remaining active students in Batch 132
  // They were mistakenly set to level_id = Alumni (0) and is_active = false
  const { data: b132Students } = await sb.from('students')
    .select('id, name, is_active, level_id, deleted_at')
    .eq('batch_id', b132.id)
    .is('deleted_at', null);

  console.log(`3. Fixing ${b132Students.length} remaining students in Batch 132...`);
  for (const st of b132Students) {
    const { error: fixErr } = await sb.from('students')
      .update({
        level_id: b132.current_level_id, // Inherit Batch 132 Level (3rd Level)
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', st.id);
    if (fixErr) {
      console.error(`   ❌ Failed to fix ${st.name}:`, fixErr);
    } else {
      console.log(`   ✓ Fixed student: ${st.name} -> Level: 3rd Level (3), is_active: true`);
    }
  }

  // Verification
  console.log('\n4. Verifying Batch 132 and Batch 134 rosters...');
  const { data: final132 } = await sb.from('students')
    .select('id, name, is_active, level_id, levels(name, level_number)')
    .eq('batch_id', b132.id)
    .is('deleted_at', null);
  console.log(`   Batch 132 Active Students (${final132.length}):`);
  final132.forEach(s => console.log(`     - ${s.name} | is_active: ${s.is_active} | Level: ${s.levels?.name}`));

  const { data: final134 } = await sb.from('students')
    .select('id, name, is_active, level_id, levels(name, level_number)')
    .eq('batch_id', b134.id)
    .is('deleted_at', null);
  console.log(`   Batch 134 Active Students (${final134.length}):`);
  final134.forEach(s => console.log(`     - ${s.name} | is_active: ${s.is_active} | Level: ${s.levels?.name}`));

  console.log('\n✅ All operations completed successfully!');
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
