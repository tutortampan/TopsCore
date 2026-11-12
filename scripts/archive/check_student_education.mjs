import { createClient } from '@supabase/supabase-js';

const SUPABASE_CLOUD_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const sb = createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_ANON_KEY);

async function inspectStudentEducation() {
  const { data: students } = await sb.from('students')
    .select('id, name, birth_date, gender, education, is_active, program_status')
    .limit(20);

  console.log('Sample 20 students education and birth_date:');
  students?.forEach(s => {
    console.log(`- ${s.name} | DOB: ${s.birth_date} | Gender: ${s.gender} | Edu: ${JSON.stringify(s.education)} | Status: ${s.program_status || (s.is_active ? 'Active' : 'Inactive')}`);
  });
}

inspectStudentEducation().catch(console.error);

