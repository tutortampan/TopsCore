const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

async function fetchDb(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
    headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}` }
  });
  return res.json();
}

async function updateDb(table, id, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': ANON_KEY, 'Authorization': `Bearer ${ANON_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function run() {
  const levels = await fetchDb('levels', '?level_number=eq.3&select=*');
  const level3Id = levels[0].id;
  console.log('Level 3 ID:', level3Id);

  const programs = await fetchDb('programs', '?name=ilike.*Camp*&select=*');
  const campProgramId = programs[0].id;
  console.log('Camp Program ID:', campProgramId);

  const vocab3 = await fetchDb('classes', `?name=eq.Vocabulary 3&program_id=eq.${campProgramId}&select=*`);
  
  if (vocab3 && vocab3.length > 0) {
    const classId = vocab3[0].id;
    const res = await updateDb('classes', classId, { deleted_at: null, level_id: level3Id });
    console.log('Restored Vocabulary 3:', res[0].id);
  } else {
    console.log('Vocabulary 3 not found.');
  }
}
run().catch(console.error);
