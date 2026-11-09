import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: att } = await sb
    .from('attempts')
    .select('id, started_at, expires_at, status')
    .eq('id', 'f8df3538-47e6-4d20-bed8-02d366c7eead')
    .single();

  console.log('Ari Wahyu Attempt:', att);
}

main().catch(console.error);
