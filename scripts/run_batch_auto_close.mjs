import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  console.log('Running batch sweep: sb.rpc("auto_close_expired_attempts")...');
  const { data, error } = await sb.rpc('auto_close_expired_attempts');
  console.log('Result:', { data, error });

  // Check remaining in_progress attempts
  const { data: remaining, count } = await sb
    .from('attempts')
    .select('id, status, started_at, expires_at', { count: 'exact' })
    .eq('status', 'in_progress');

  console.log(`Remaining in_progress attempts: ${count}`);
  (remaining || []).forEach(r => {
    console.log(r);
  });
}

main().catch(console.error);
