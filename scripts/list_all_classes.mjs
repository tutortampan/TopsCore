import { getSupabase } from '../js/supabase.js';

async function listAllAcademicEntities() {
  const sb = await getSupabase();

  // 1. Classes
  const { data: classes } = await sb.from('classes')
    .select('id, name, code, is_active, program_id, programs(name, institutions(name)), class_levels(levels(name, level_number))')
    .order('name');

  // 2. Modules
  const { data: modules } = await sb.from('modules')
    .select('id, name, code, is_active')
    .order('name');

  // 3. Distinct test types / categories
  const { data: tests } = await sb.from('tests')
    .select('test_type, category, shell_code, title')
    .limit(500);

  console.log('=== 1. CLASSES IN DATABASE ===');
  classes?.forEach(c => {
    console.log(`- "${c.name}" | Current Code: "${c.code}"`);
  });

  console.log('\n=== 2. MODULES IN DATABASE ===');
  modules?.forEach(m => {
    console.log(`- "${m.name}" | Code: "${m.code}"`);
  });

  const testTypes = new Set(tests?.map(t => t.test_type).filter(Boolean));
  const categories = new Set(tests?.map(t => t.category).filter(Boolean));
  console.log('\n=== 3. TEST TYPES & CATEGORIES ===');
  console.log('Test Types:', Array.from(testTypes));
  console.log('Categories:', Array.from(categories));
}

listAllAcademicEntities().catch(console.error);
