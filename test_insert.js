import fs from 'fs';
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/)[1];

async function testInsert() {
  const payload = [{
          assessment_id: '031ce0e1-d369-4960-9bce-8bcbf3689fb7',
          question_text_snapshot: 'test',
          accepted_answers_snapshot: ['test'],
          options_snapshot: [],
          topic_snapshot: 'General',
          word_type_snapshot: 'Verb',
          answer_type: 'written',
          display_order: 1,
          created_at: new Date().toISOString()
  }];

  const res = await fetch(`${url}/rest/v1/assessment_questions`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  console.log("Status:", res.status);
  console.log("Data/Error:", JSON.stringify(data, null, 2));
}
testInsert();
