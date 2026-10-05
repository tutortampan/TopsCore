import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  // 1. Fetch all vocab classes
  const { data: vocabClasses, error } = await sb.from('classes')
    .select('*')
    .ilike('name', '%Vocab%')
    .is('deleted_at', null);

  if (error || !vocabClasses || vocabClasses.length === 0) {
    console.log("No vocab classes found.");
    return;
  }

  // Find a target to keep, preferably one named "Vocabulary" with a program_id, or just the first one.
  let targetClass = vocabClasses.find(c => c.name.trim().toLowerCase() === 'vocabulary' && c.program_id);
  if (!targetClass) targetClass = vocabClasses.find(c => c.program_id);
  if (!targetClass) targetClass = vocabClasses[0];

  console.log('Target class to keep:', targetClass.id, targetClass.name);

  // Rename to exactly "Vocabulary"
  if (targetClass.name !== 'Vocabulary') {
    await sb.from('classes').update({ name: 'Vocabulary' }).eq('id', targetClass.id);
  }

  const duplicates = vocabClasses.filter(c => c.id !== targetClass.id);

  for (const dup of duplicates) {
    console.log(`Processing duplicate class: ${dup.id} - ${dup.name}`);
    
    // Move assessments
    await sb.from('assessments').update({ class_id: targetClass.id }).eq('class_id', dup.id);
    
    // Handle class_levels many-to-many
    // 1. Fetch class_levels for dup
    const { data: clData } = await sb.from('class_levels').select('level_id').eq('class_id', dup.id);
    if (clData) {
      for (const cl of clData) {
        // insert into target class (handle conflict)
        const { error: insErr } = await sb.from('class_levels').insert({
          class_id: targetClass.id,
          level_id: cl.level_id
        });
        if (insErr && insErr.code !== '23505') { // Ignore unique constraint violation
            console.error('Error inserting class_levels:', insErr);
        }
      }
    }
    
    // Move from level_id column if present
    if (dup.level_id) {
        const { error: insErr } = await sb.from('class_levels').insert({
          class_id: targetClass.id,
          level_id: dup.level_id
        });
    }

    // Soft delete the duplicate
    await sb.from('classes').update({ deleted_at: new Date().toISOString() }).eq('id', dup.id);
  }

  console.log("Done consolidating vocabulary classes!");
}

main().catch(console.error);
