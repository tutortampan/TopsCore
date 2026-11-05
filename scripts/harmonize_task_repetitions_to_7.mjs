// ==============================================================================
// Script: scripts/harmonize_task_repetitions_to_7.mjs
// Description: Harmonizes task_repetitions to 7 across all test payloads in Supabase,
//              and upserts persistent site_settings so no test or class ever falls back to 6.
// ==============================================================================

import { getSupabase } from '../js/supabase.js';

async function main() {
  console.log('=== HARMONIZING TASK REPETITIONS TO 7 IN SUPABASE ===');
  const sb = await getSupabase();

  // 1. Upsert site_settings
  const settingsRows = [
    {
      key: 'default_test_system_settings',
      value: JSON.stringify({ taskRepetitions: 7, taskMinScore: 70, examMinScore: 60 }),
      updated_at: new Date().toISOString()
    },
    {
      key: 'class_test_settings_2ccf6468-1e03-41d1-b72b-1d84dcad85b2', // 2nd Vocabulary
      value: JSON.stringify({ taskRepetitions: 7, taskMinScore: 50, examMinScore: 60 }),
      updated_at: new Date().toISOString()
    },
    {
      key: 'class_test_settings_ab33498a-90e6-44b7-83f4-5765f964543e', // 3rd Vocabulary
      value: JSON.stringify({ taskRepetitions: 7, taskMinScore: 50, examMinScore: 60 }),
      updated_at: new Date().toISOString()
    }
  ];

  console.log('Upserting site_settings test system configs...');
  for (const s of settingsRows) {
    const { error: setErr } = await sb.from('site_settings').upsert(s, { onConflict: 'key' });
    if (setErr) console.error('Error upserting site_setting:', s.key, setErr);
    else console.log(`  ✅ site_setting '${s.key}' set to 7 repetitions.`);
  }

  // 2. Fetch all tests and harmonize payload.task_repetitions
  console.log('\nFetching tests to inspect payload.task_repetitions...');
  const { data: tests, error: tErr } = await sb.from('tests')
    .select('id, shell_code, title, payload, minimum_required_score, class_id')
    .order('shell_code');

  if (tErr) throw tErr;
  console.log(`Found ${tests.length} total tests in database.`);

  const needsUpdate = [];
  for (const t of tests) {
    const pl = t.payload || {};
    if (pl.task_repetitions !== 7) {
      const updatedPayload = { ...pl, task_repetitions: 7 };
      needsUpdate.push({
        id: t.id,
        shell_code: t.shell_code,
        old_reps: pl.task_repetitions,
        new_payload: updatedPayload
      });
    }
  }

  console.log(`Tests needing payload.task_repetitions update: ${needsUpdate.length}`);
  if (needsUpdate.length > 0) {
    const CHUNK = 25;
    let count = 0;
    for (let i = 0; i < needsUpdate.length; i += CHUNK) {
      const batch = needsUpdate.slice(i, i + CHUNK);
      await Promise.all(batch.map(async item => {
        const { error } = await sb.from('tests')
          .update({
            payload: item.new_payload,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        if (error) console.error(`Error updating test ${item.shell_code}:`, error);
        else count++;
      }));
      console.log(`Updated ${count}/${needsUpdate.length} tests...`);
    }
    console.log(`✅ Successfully updated ${count} tests to task_repetitions = 7!`);
  } else {
    console.log('All tests already have task_repetitions = 7.');
  }

  // 3. Verification: Check 2nd Vocabulary tests
  console.log('\nVerifying 2nd Vocabulary tests in database:');
  const { data: vocab2Tests } = await sb.from('tests')
    .select('id, shell_code, minimum_required_score, payload')
    .eq('class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2')
    .order('shell_code');

  let allSeven = true;
  vocab2Tests.forEach(t => {
    const reps = t.payload?.task_repetitions;
    if (reps !== 7) allSeven = false;
  });
  console.log(`2nd Vocabulary (${vocab2Tests.length} tests): All have task_repetitions = 7? ${allSeven}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
