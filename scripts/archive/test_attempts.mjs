import { readFileSync } from 'fs';
const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/attempts?status=eq.in_progress&select=id,student_id,assessment_id`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const attempts = await res.json();
  console.log('In-progress attempts:', attempts.length);
  for (const att of attempts) {
    const ansRes = await fetch(`${SUPABASE_URL}/rest/v1/attempt_answers?attempt_id=eq.${att.id}&select=id`, {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const ans = await ansRes.json();
    console.log('Attempt', att.id, 'Answers:', ans.length);
    if (ans.length === 0) {
      console.log('Deleting empty attempt', att.id);
      await fetch(`${SUPABASE_URL}/rest/v1/attempts?id=eq.${att.id}`, {
        method: 'DELETE',
        headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
      });
    }
  }
}
run().catch(console.error);
