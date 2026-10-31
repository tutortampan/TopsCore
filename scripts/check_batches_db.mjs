const url = 'https://oclajpyumehpojepcczg.supabase.co';
const key = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const res = await fetch(`${url}/rest/v1/batches?select=id,name,is_active,deleted_at,program_id`, {
  headers: {
    'apikey': key,
    'Authorization': `Bearer ${key}`
  }
});
const data = await res.json();
console.log('Batches count:', data.length);
console.table(data);
