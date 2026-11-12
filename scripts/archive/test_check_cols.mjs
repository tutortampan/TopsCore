import { getSupabase } from '../js/supabase.js';

async function checkCols() {
  const sb = await getSupabase();
  for (const t of ['conversation_sessions', 'conversation_turns', 'live_sessions']) {
    const { data, error } = await sb.from(t).select('*').limit(1);
    if (error) {
      console.log(t, 'error:', error.message);
    } else {
      console.log(t, 'sample row keys:', data.length > 0 ? Object.keys(data[0]) : '(0 rows, schema exists)');
    }
  }
}

checkCols().catch(console.error);
