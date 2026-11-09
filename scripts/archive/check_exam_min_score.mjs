import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data } = await sb.from('tests')
    .select('id, title, minimum_required_score, payload')
    .in('shell_code', ['2A-WORDS-EXAM', '2B-WORDS-EXAM', '2C-WORDS-EXAM']);

  console.log('Exam min scores:');
  data.forEach(d => {
    console.log(`${d.title}: minimum_required_score = ${d.minimum_required_score}, payload.min_score = ${d.payload?.min_score}`);
  });
}
main().catch(console.error);
