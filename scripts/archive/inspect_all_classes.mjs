import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectClasses() {
  const { data: classes } = await sb.from('classes').select('id, name, program_id');
  console.log('Classes:', classes);
  for (const c of classes) {
    const { count } = await sb.from('tests').select('*', { count: 'exact', head: true }).eq('class_id', c.id);
    console.log(`Class: ${c.name} (${c.id}) -> ${count} tests`);
  }
}

inspectClasses();
