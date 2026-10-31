import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanAllForgivenPayloads() {
  console.log('--- Cleaning forgiven_student_ids from all tests ---');
  const { data: tests, error } = await sb.from('tests').select('id, title, payload');
  if (error) {
    console.error('Error fetching tests:', error);
    return;
  }

  let cleanedCount = 0;
  for (const t of tests) {
    if (t.payload && t.payload.forgiven_student_ids) {
      const newPayload = { ...t.payload };
      delete newPayload.forgiven_student_ids;
      const { error: updErr } = await sb.from('tests').update({ payload: newPayload }).eq('id', t.id);
      if (updErr) {
        console.error(`Failed to clean test ${t.title} (${t.id}):`, updErr);
      } else {
        cleanedCount++;
      }
    }
  }

  console.log(`Successfully cleaned forgiven_student_ids from ${cleanedCount} tests!`);
}

cleanAllForgivenPayloads();
