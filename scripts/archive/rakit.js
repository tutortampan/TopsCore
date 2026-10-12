import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching Level 1...');
  const { data: levels } = await supabase.from('levels').select('*').eq('level_number', 1);
  if (!levels || levels.length === 0) {
    console.error('Level 1 not found.');
    return;
  }
  const level1 = levels[0];

  console.log('Fetching Basic English class...');
  const { data: classes } = await supabase.from('classes')
    .select('*')
    .eq('name', 'Basic English')
    .eq('level_id', level1.id);
  
  if (!classes || classes.length === 0) {
    console.error('Basic English class not found.');
    return;
  }
  const basicEnglishClass = classes[0];

  console.log('Class found:', basicEnglishClass.id);

  // Define assessments to create
  const desiredAssessments = [
    {
      class_id: basicEnglishClass.id,
      title: 'Basic English - Point & Speak',
      description: 'Point and speak exercises for Basic English.',
      assessment_type: 'm1',
      assessment_category: 'TASK',
      status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      class_id: basicEnglishClass.id,
      title: 'Basic English - Storytelling',
      description: 'Storytelling exercises for Basic English.',
      assessment_type: 'm2',
      assessment_category: 'TASK',
      status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      class_id: basicEnglishClass.id,
      title: 'Basic English - Multiple Choice Test',
      description: 'Multiple choice evaluation for Basic English.',
      assessment_type: 'm4',
      assessment_category: 'TEST',
      status: 'PUBLISHED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  console.log('Checking existing assessments...');
  const { data: existing } = await supabase.from('assessments').select('*').eq('class_id', basicEnglishClass.id);

  for (const asm of desiredAssessments) {
    const exists = existing && existing.find(e => e.title === asm.title);
    if (!exists) {
      console.log(`Inserting: ${asm.title}`);
      const { error } = await supabase.from('assessments').insert(asm);
      if (error) {
        console.error('Error inserting:', asm.title, error.message);
      } else {
        console.log(`Inserted: ${asm.title}`);
      }
    } else {
      console.log(`Already exists: ${asm.title}`);
    }
  }

  console.log('Done!');
}

run();
