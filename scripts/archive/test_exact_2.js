import fs from 'fs';
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/)[1];

async function testUpdate() {
  console.log("Fetching levels and batches...");
  // Get a level id
  let res = await fetch(`${url}/rest/v1/levels?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  let data = await res.json();
  const levelId = data[0].id;
  
  // Get a batch id
  res = await fetch(`${url}/rest/v1/batches?limit=1`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  data = await res.json();
  const batchId = data[0].id;
  
  console.log(`Updating batch ${batchId} to level ${levelId}...`);
  // update batch
  res = await fetch(`${url}/rest/v1/batches?id=eq.${batchId}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ current_level_id: levelId })
  });
  data = await res.json();
  console.log("Batch Update Status:", res.status);
  console.log("Batch Update Data:", JSON.stringify(data, null, 2));
  
  console.log(`Updating students in batch ${batchId} to level ${levelId}...`);
  // update students
  res = await fetch(`${url}/rest/v1/students?batch_id=eq.${batchId}`, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ level_id: levelId })
  });
  data = await res.json();
  console.log("Students Update Status:", res.status);
  console.log("Students Update Data:", JSON.stringify(data, null, 2));
}

testUpdate();
