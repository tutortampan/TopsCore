import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectTests() {
  const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
  const { data: tests } = await sb.from('tests').select('id, title, display_order, shell_code, payload').eq('class_id', classId).order('display_order');
  console.log('Total tests for class:', tests.length);
  tests.forEach(t => {
    const rawTheme = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
    console.log(`Test ${t.display_order}: [${t.shell_code}] theme: ${rawTheme} payload.theme: ${t.payload?.theme_code}`);
  });
}

inspectTests();
