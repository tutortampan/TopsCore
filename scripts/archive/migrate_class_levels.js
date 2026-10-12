import fs from 'fs';
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/)[1];

async function migrateClassLevels() {
  // First fetch classes with level_id
  const res = await fetch(`${url}/rest/v1/classes?select=id,level_id`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  });
  const classes = await res.json();
  const validClasses = classes.filter(c => c.level_id);
  console.log(`Found ${validClasses.length} classes with a level_id.`);

  // Insert into class_levels
  if (validClasses.length > 0) {
    const payload = validClasses.map(c => ({ class_id: c.id, level_id: c.level_id }));
    const insertRes = await fetch(`${url}/rest/v1/class_levels`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates'
      },
      body: JSON.stringify(payload)
    });
    
    if (insertRes.ok) {
      console.log('Successfully migrated class_levels');
    } else {
      console.error('Failed to migrate class_levels:', await insertRes.text());
    }
  }
}

migrateClassLevels();
