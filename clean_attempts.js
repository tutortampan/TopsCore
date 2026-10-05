import fs from 'fs';
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/)[1];

async function check() {
  const sbHeaders = { 'apikey': key, 'Authorization': `Bearer ${key}` };
  
  // 1. Find all in_progress attempts
  const res = await fetch(`${url}/rest/v1/attempts?status=eq.in_progress&select=id,assessment_id`, {
    headers: sbHeaders
  });
  const attempts = await res.json();
  
  console.log(`Found ${attempts.length} in_progress attempts.`);
  
  for (const attempt of attempts) {
    // Check how many attempt_answers it has
    const aRes = await fetch(`${url}/rest/v1/attempt_answers?attempt_id=eq.${attempt.id}&select=id`, {
      headers: sbHeaders
    });
    const answers = await aRes.json();
    console.log(`Attempt ${attempt.id} (Assessment: ${attempt.assessment_id}) has ${answers.length} answers.`);
    
    if (answers.length === 0) {
      console.log(`Deleting stuck attempt ${attempt.id}...`);
      await fetch(`${url}/rest/v1/attempts?id=eq.${attempt.id}`, {
        method: 'DELETE',
        headers: sbHeaders
      });
      console.log(`Deleted.`);
    }
  }
}
check();
