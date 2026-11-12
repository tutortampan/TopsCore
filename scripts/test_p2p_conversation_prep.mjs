import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data: testSample, error: testErr } = await sb.from('tests').select('*').limit(1);
  console.log('Sample test:', testSample ? Object.keys(testSample[0]) : testErr);

  const { data: attemptSample, error: attemptErr } = await sb.from('attempts').select('*').limit(1);
  console.log('Sample attempt:', attemptSample ? Object.keys(attemptSample[0]) : attemptErr);
}

main().catch(console.error);
