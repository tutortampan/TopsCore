import { getSupabase } from '../js/supabase.js';

async function main() {
  const sb = await getSupabase();
  const { data } = await sb.from('tests')
    .select('id, title, shell_code, test_type, payload, minimum_required_score')
    .eq('class_id', '2ccf6468-1e03-41d1-b72b-1d84dcad85b2')
    .is('deleted_at', null)
    .order('display_order');

  console.log('All tests in 2nd Vocabulary:');
  data.forEach(t => {
    console.log(`[${t.id}] ${t.shell_code} | type: ${t.test_type} | theme: ${t.payload?.theme_code} | title: ${t.title}`);
  });
}
main().catch(console.error);
