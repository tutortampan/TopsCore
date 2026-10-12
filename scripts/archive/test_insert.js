import fs from 'fs';
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/)[1];

async function testInsert() {
  const payload = [{
    name: 'test_anon',
    pin_hash: '123',
    institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
    program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
    batch_id: '2bb3f43a-d618-4f8a-9a98-31c157ff7a30',
    is_active: true
  }];

  const res = await fetch(`${url}/rest/v1/students`, {
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
