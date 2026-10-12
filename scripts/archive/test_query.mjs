import { readFileSync } from 'fs';

const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

async function run() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/assessments?class_id=eq.ab33498a-90e6-44b7-83f4-5765f964543e&select=title,payload`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  const data = await res.json();
  console.log('Total Assessments for Class:', data.length);
  console.log('Assessments Sample:', data.slice(0, 3));
  
  if (data[0] && data[0].payload) {
    const { theme_code, topic_code } = data[0].payload;
    console.log('Fetching vault for', theme_code, topic_code);
    let q = `${SUPABASE_URL}/rest/v1/vocabulary_vault?theme_code=eq.${theme_code}`;
    if (topic_code) q += `&topic_code=eq.${topic_code}`;
    const vRes = await fetch(q + '&select=indonesian,english,deleted_at', {
      headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
    });
    const vData = await vRes.json();
    console.log('Vault words found:', vData.length);
    console.log('Sample:', vData.slice(0, 2));
  }
}
run().catch(console.error);
