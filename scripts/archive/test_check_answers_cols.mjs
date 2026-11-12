import { getSupabase } from '../js/supabase.js';

async function checkAttemptAnswers() {
  const sb = await getSupabase();
  const { data } = await sb.from('attempt_answers').select('*').limit(1);
  console.log('attempt_answers keys:', data ? Object.keys(data[0]) : 'no rows');
}

checkAttemptAnswers().catch(console.error);
