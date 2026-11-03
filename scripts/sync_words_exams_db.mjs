global.window = { addEventListener: () => {}, location: { hostname: 'localhost' } };
const { getSupabase } = await import('../js/supabase.js');

const sb = await getSupabase();

const { data, error } = await sb.from('tests')
  .update({
    answer_type: 'written',
    minimum_required_score: 70
  })
  .in('shell_code', ['3A-WORDS-EXAM', '3B-WORDS-EXAM', '3C-WORDS-EXAM', '3D-WORDS-EXAM'])
  .select('shell_code, answer_type, minimum_required_score');

if (error) {
  console.error("Update error:", error);
  process.exit(1);
}

console.log("Updated Words Exams in DB:", data);
