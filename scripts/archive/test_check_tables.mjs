import { getSupabase } from '../js/supabase.js';

async function listTables() {
  const sb = await getSupabase();
  const tables = [
    'institutions', 'programs', 'batches', 'classes', 'levels',
    'students', 'tests', 'attempts', 'attempt_answers', 'audit_logs',
    'conversation_sessions', 'conversation_turns', 'live_sessions'
  ];
  for (const t of tables) {
    const { count, error } = await sb.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}:`, error ? `❌ ${error.message} (${error.code})` : `✅ Exists (count: ${count})`);
  }
}

listTables().catch(console.error);
