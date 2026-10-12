import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanAndInit() {
  // 1. Get levels
  const { data: levels } = await supabase.from('levels').select('*');
  const level1 = levels.find(l => l.level_number === 1).id;
  const level2 = levels.find(l => l.level_number === 2).id;
  const level3 = levels.find(l => l.level_number === 3).id;

  // 2. Get current classes
  const { data: classes } = await supabase.from('classes').select('*');

  // Define what we want
  const desiredClasses = [
    { name: 'Vocabulary 1', level_id: level1 },
    { name: 'Basic English', level_id: level1 },
    { name: 'Storytelling 1', level_id: level1 },
    { name: 'Vocabulary 2', level_id: level2 },
    { name: 'Telling Story', level_id: level2 },
    { name: 'Public Speaking', level_id: level2 },
    { name: 'Vocabulary 3', level_id: level3 },
    { name: 'Speaking Projects', level_id: level3 },
  ];

  // Map to keep track of kept class IDs
  const keptClasses = [];
  const toDelete = [];

  for (const c of classes) {
    // Check if it's a desired class that we haven't kept yet
    const desired = desiredClasses.find(d => d.name === c.name && d.level_id === c.level_id);
    
    // Also map variants (e.g. 'Story Telling' -> 'Telling Story' in level 2, or 'Story Telling' -> 'Storytelling 1' in level 1)
    if (desired && !keptClasses.find(k => k.name === c.name && k.level_id === c.level_id)) {
      keptClasses.push(c);
    } else if (c.name === 'Vocabulary' && c.level_id === level3 && !keptClasses.find(k => k.name === 'Vocabulary 3')) {
       // Rename 'Vocabulary' to 'Vocabulary 3'
       await supabase.from('classes').update({ name: 'Vocabulary 3' }).eq('id', c.id);
       keptClasses.push({ ...c, name: 'Vocabulary 3' });
    } else {
      toDelete.push(c.id);
    }
  }

  // Soft delete / Delete unused classes
  if (toDelete.length > 0) {
    console.log('Deleting redundant classes:', toDelete);
    await supabase.from('classes').delete().in('id', toDelete);
  }

  // Insert missing classes
  for (const d of desiredClasses) {
    if (!keptClasses.find(k => k.name === d.name && k.level_id === d.level_id)) {
      console.log('Inserting missing class:', d.name);
      await supabase.from('classes').insert([d]);
    }
  }

  console.log('Database cleaned and initialized!');
}

cleanAndInit().catch(console.error);
