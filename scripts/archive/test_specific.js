import fs from 'fs';
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/)[1];

async function check() {
  const res = await fetch(`${url}/rest/v1/assessment_questions?assessment_id=eq.031ce0e1-d369-4960-9bce-8bcbf3689fb7`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log("Questions found:", data.length);
}
check();
