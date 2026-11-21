import { createClient } from '@supabase/supabase-js';

if (typeof process.loadEnvFile === 'function') {
  try { process.loadEnvFile(); } catch (_) {}
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://lgzkbmsyqhvdjirbyzsg.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  console.log('====================================================');
  console.log('🔍 TOPSCORE SYSTEM AUDIT: LEVELS, CLASSES, & TESTS');
  console.log('====================================================\n');

  // 1. Levels
  const { data: levels } = await sb.from('levels').select('id, name, level_number').order('level_number');
  console.log('--- LEVELS ---');
  levels.forEach(l => console.log(`[Level ${l.level_number}] ${l.name} -> ID: ${l.id}`));

  // 2. Classes per level for Camp
  const campProgramId = '11deb53c-434a-44b0-83ca-1cc9b239cab3';
  const { data: campClasses } = await sb.from('classes')
    .select('id, name, code, level_id, is_active')
    .eq('program_id', campProgramId)
    .order('code');

  console.log('\n--- CAMP CLASSES ---');
  campClasses.forEach(c => {
    const lvl = levels.find(l => l.id === c.level_id);
    console.log(`${c.code.padEnd(12)} | ${c.name.padEnd(25)} | Level: ${(lvl?.name || 'Unknown').padEnd(10)} | Active: ${c.is_active} | ID: ${c.id}`);
  });

  // 3. Tests per Camp class
  console.log('\n--- PUBLISHED TESTS FOR CAMP CLASSES ---');
  for (const c of campClasses) {
    const { data: tests } = await sb.from('tests')
      .select('id, title, shell_code, test_type, status, payload')
      .eq('class_id', c.id)
      .eq('status', 'PUBLISHED')
      .order('shell_code');

    if (tests && tests.length > 0) {
      console.log(`\n📚 Class: ${c.name} (${c.code}) [${tests.length} tests]`);
      tests.forEach(t => {
        const minScore = t.payload?.min_score || t.payload?.minimum_required_score || 60;
        console.log(`   • [${t.test_type.toUpperCase().padEnd(4)}] ${t.shell_code.padEnd(18)} | MinScore: ${minScore}% | ${t.title} (${t.id})`);
      });
    }
  }

  // 4. Batch 123 details
  console.log('\n--- BATCH 123 DETAILS ---');
  const { data: b123 } = await sb.from('batches').select('*').ilike('name', '%123%');
  console.log(b123);

  // 5. Student Asik details
  console.log('\n--- STUDENT ASIK DETAILS ---');
  const { data: asik } = await sb.from('students').select('*').ilike('name', '%asik%');
  console.log(asik);
}

main().catch(console.error);
