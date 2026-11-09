const url = 'https://oclajpyumehpojepcczg.supabase.co';
const key = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const [progRes, batchRes] = await Promise.all([
  fetch(`${url}/rest/v1/programs?select=id,name,is_active,institution_id`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  }),
  fetch(`${url}/rest/v1/batches?select=id,name,is_active,program_id,deleted_at`, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  })
]);

const programs = await progRes.json();
const batches = await batchRes.json();

const formatSidebarBatchLabel = (progName, batchName) => {
  const p = (progName || '').trim();
  const b = (batchName || '').trim();
  if (!b) return p;
  if (b.toLowerCase().startsWith(p.toLowerCase())) return b;
  return `${p} ${b}`;
};

const validBatches = (batches || []).filter(b => !b.deleted_at);
const activeBatches = validBatches.filter(b => b.is_active !== false);

const activePrograms = (programs || []).filter(p => p.is_active !== false && (activeBatches.some(b => b.program_id === p.id) || !validBatches.some(b => b.program_id === p.id)));
activePrograms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

const items = [];
activePrograms.forEach(prog => {
  const pActiveBatches = activeBatches.filter(b => b.program_id === prog.id);
  if (pActiveBatches.length > 0) {
    pActiveBatches.sort((a, b) => (b.name || '').localeCompare(a.name || '', undefined, { numeric: true }));
    pActiveBatches.forEach(b => {
      const label = formatSidebarBatchLabel(prog.name, b.name);
      items.push({
        id: `${prog.id}::${b.id}`,
        program_id: prog.id,
        program_name: prog.name,
        batch_id: b.id,
        batch_name: b.name,
        label: label,
        is_active: true
      });
    });
  } else if (!validBatches.some(b => b.program_id === prog.id)) {
    items.push({
      id: prog.id,
      program_id: prog.id,
      program_name: prog.name,
      batch_id: null,
      batch_name: null,
      label: prog.name,
      is_active: true
    });
  }
});

console.log('Sidebar items generated:');
console.table(items);
