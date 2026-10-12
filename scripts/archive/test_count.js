import fs from 'fs';
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/)[1];

async function countAssessments() {
  const res = await fetch(`${url}/rest/v1/assessments?level_id=eq.51589e1a-d96e-496e-92a3-d9d350483555`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const data = await res.json();
  console.log("Assessments count:", data.length);
  if (data.length > 0) console.log(data.map(d => d.title).join('\n'));
}
countAssessments();
