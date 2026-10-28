import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  console.log('Calling auto_close_expired_attempts() for Ari Wahyu attempt f8df3538-47e6-4d20-bed8-02d366c7eead...');
  
  const { data, error } = await sb.rpc('auto_close_expired_attempts', {
    p_attempt_id: 'f8df3538-47e6-4d20-bed8-02d366c7eead'
  });

  console.log('RPC result:', { data, error });

  // Now check the attempt status and score
  const { data: updated } = await sb
    .from('attempts')
    .select('id, status, score, percentage, grade, submitted_at')
    .eq('id', 'f8df3538-47e6-4d20-bed8-02d366c7eead')
    .single();

  console.log('Updated Attempt State:', updated);
}

main().catch(console.error);
