import { createClient } from '@supabase/supabase-js';

const SUPABASE_CLOUD_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const sb = createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_ANON_KEY);

async function checkStudentsSchema() {
  const { data, error } = await sb.from('students').select('*').limit(3);
  console.log('Students schema sample row:', data?.[0]);
  console.log('Available columns in students table:');
  if (data?.[0]) {
    console.log(Object.keys(data[0]));
  }
}

checkStudentsSchema().catch(console.error);

