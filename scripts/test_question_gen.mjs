import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function main() {
  const api = await import('../js/api.js');
  const { data: tests } = await sb.from('tests')
    .select('*')
    .in('class_id', [
      '9b27101a-efa4-4bd8-b399-45592fdad7e0', // Camp 1st Vocab
      '2ccf6468-1e03-41d1-b72b-1d84dcad85b2', // Camp 2nd Vocab
      'ab33498a-90e6-44b7-83f4-5765f964543e'  // Camp 3rd Vocab
    ])
    .eq('status', 'PUBLISHED')
    .order('shell_code');

  console.log(`Testing generateTestQuestions for ${tests.length} published tests...`);
  for (const t of tests) {
    try {
      const q = await api.generateTestQuestions(sb, t);
      console.log(`[${t.shell_code}] (${t.title}) -> ${q.length} questions (Payload req: ${t.payload?.total_questions || 'N/A'}, Category: ${t.payload?.category})`);
    } catch (err) {
      console.error(`[${t.shell_code}] ERROR: ${err.message}`);
    }
  }
}

main().catch(console.error);
