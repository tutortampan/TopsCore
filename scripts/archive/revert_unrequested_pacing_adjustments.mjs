import { getSupabase } from '../js/supabase.js';

async function revertUnrequestedPacingAdjustments() {
  const sb = await getSupabase();

  console.log('===============================================================');
  console.log('TOPSCORE LMS — REVERT UNREQUESTED PACING ADJUSTMENTS (OPSI 1)');
  console.log('===============================================================\n');

  const TARGET_ATTEMPT_IDS = [
    'a45256b9-f630-442e-ba1f-c9c30b3d50bc', // Mr. Muhamad Alifurrahman
    'da74e6aa-9a18-43bc-be2c-5227fbdf9107', // Miss Adinda Karunia Farela
    '2bef40de-ab53-4966-81b7-a65e0faacdde', // Mr. Abdul Basit
    '1ed59954-fa6b-42fa-8b96-8a4397aa1128'  // Mr. Muhammad Ariwil Asrori
  ];

  // 1. Fetch current status of the 4 attempts
  const { data: beforeList, error: fetchErr } = await sb
    .from('attempts')
    .select('id, student_id, test_id, percentage, effective_score, is_forgiven, forgiven_reason, forgiven_by, forgiven_at')
    .in('id', TARGET_ATTEMPT_IDS);

  if (fetchErr) {
    console.error('❌ Failed to fetch attempts:', fetchErr.message);
    process.exit(1);
  }

  console.log(`Found ${beforeList?.length || 0} target attempts in database:`);
  for (const a of beforeList) {
    const { data: student } = await sb.from('students').select('name').eq('id', a.student_id).single();
    console.log(`  - Student: ${student?.name || a.student_id}`);
    console.log(`    Attempt ID: ${a.id}`);
    console.log(`    Score: ${a.percentage}% (Effective: ${a.effective_score}%)`);
    console.log(`    is_forgiven: ${a.is_forgiven}`);
    console.log(`    forgiven_reason: ${a.forgiven_reason}`);
  }

  // Also search for any other attempt with "Pacing Adjustment Topic C1 Mastery"
  const { data: extraMatches } = await sb
    .from('attempts')
    .select('id, student_id, is_forgiven, forgiven_reason')
    .ilike('forgiven_reason', '%Pacing Adjustment Topic C1 Mastery%');

  const allIdsToRevert = new Set([...TARGET_ATTEMPT_IDS]);
  if (extraMatches) {
    extraMatches.forEach(m => allIdsToRevert.add(m.id));
  }

  console.log(`\nReverting ${allIdsToRevert.size} attempt(s) to is_forgiven: false, forgiven_reason: null...`);

  const { data: updated, error: updateErr } = await sb
    .from('attempts')
    .update({
      is_forgiven: false,
      forgiven_reason: null,
      forgiven_by: null,
      forgiven_at: null
    })
    .in('id', Array.from(allIdsToRevert))
    .select('id, student_id, is_forgiven, forgiven_reason');

  if (updateErr) {
    console.error('❌ Update failed:', updateErr.message);
    process.exit(1);
  }

  console.log(`\n✅ Successfully updated ${updated?.length || 0} attempt(s)!`);

  // 2. Verification
  console.log('\n--- VERIFICATION OF RESTORED ATTEMPTS ---');
  const { data: afterList } = await sb
    .from('attempts')
    .select('id, student_id, is_forgiven, forgiven_reason')
    .in('id', Array.from(allIdsToRevert));

  let allClean = true;
  for (const a of afterList) {
    const { data: student } = await sb.from('students').select('name').eq('id', a.student_id).single();
    const isClean = a.is_forgiven === false && a.forgiven_reason === null;
    console.log(`  - ${student?.name}: is_forgiven=${a.is_forgiven}, reason=${a.forgiven_reason} -> ${isClean ? '✅ RESTORED' : '❌ NOT RESTORED'}`);
    if (!isClean) allClean = false;
  }

  console.log('\n===============================================================');
  if (allClean) {
    console.log('🏆 OPSI 1 COMPLETE: All unrequested pacing adjustments REVERTED!');
  } else {
    console.log('❌ OPSI 1 FAILED: Some attempts could not be reverted.');
  }
  console.log('===============================================================\n');

  process.exit(allClean ? 0 : 1);
}

revertUnrequestedPacingAdjustments().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
