
import { createClient } from '@supabase/supabase-js';
const url = 'http://127.0.0.1:54321';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const sb = createClient(url, key);
async function run() {
  const { data, error } = await sb.from('batches').select('*').limit(1);
  console.log('GET:', data, error);
  if (data && data.length) {
    const { data: updData, error: updErr } = await sb.from('batches').update({ current_level_id: null }).eq('id', data[0].id).select();
    console.log('UPDATE:', updData, updErr);
  }
}
run();

