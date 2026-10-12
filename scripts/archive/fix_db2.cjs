const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function fixTable(tableName, columns) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=id,${columns.join(',')}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY }
  });
  const data = await r.json();
  if (!Array.isArray(data)) return;
  let updated = 0;
  for (let a of data) {
    let changed = false;
    let payload = {};
    for (let k of columns) {
      if (a[k] && typeof a[k] === 'string' && (a[k].includes('Ã¢€¢') || a[k].includes('â€¢') || a[k].includes('Ã¢') || a[k].includes('â€”'))) {
        payload[k] = a[k].replace(/Ã¢€¢|â€¢/g, '•')
                         .replace(/Ã¢€”|â€”/g, '—')
                         .replace(/Ã¢/g, ''); // fallback
        changed = true;
      }
    }
    if (changed) {
      await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=eq.${a.id}`, {
        method: 'PATCH',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`Fixed ${tableName}: ` + a.id);
      updated++;
    }
  }
  console.log(`Done ${tableName}. Fixed: ` + updated);
}

async function run() {
    await fixTable('programs', ['name', 'description']);
    await fixTable('classes', ['name', 'description']);
    await fixTable('levels', ['name']);
    await fixTable('batches', ['name']);
    await fixTable('questions', ['text', 'question_text']);
}
run().catch(console.error);
