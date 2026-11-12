import { createClient } from '@supabase/supabase-js';

const SUPABASE_CLOUD_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const sb = createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_ANON_KEY);

async function heal() {
  const testId = 'ca970efc-4e0e-40ae-bc18-0e7295400737';
  const { data: test, error: fetchErr } = await sb.from('tests').select('*').eq('id', testId).single();
  if (fetchErr || !test) {
    console.error('Could not fetch test:', fetchErr);
    process.exit(1);
  }

  console.log('BEFORE HEALING:');
  console.log(`Title: ${test.title}`);
  console.log(`Shell: ${test.shell_code}`);
  console.log('Payload:', test.payload);

  const updatedPayload = {
    ...(test.payload || {}),
    shell_code: '1G1-WORDS-TASK',
    theme_code: 'G',
    topic_code: '1',
    themes: ['G']
  };

  const { data: updated, error: updateErr } = await sb.from('tests').update({
    title: '1st Vocabulary G1 Words Task - Time Name',
    shell_code: '1G1-WORDS-TASK',
    payload: updatedPayload,
    updated_at: new Date().toISOString()
  }).eq('id', testId).select().single();

  if (updateErr) {
    console.error('Update failed:', updateErr);
    process.exit(1);
  }

  console.log('\nAFTER HEALING:');
  console.log(`Title: ${updated.title}`);
  console.log(`Shell: ${updated.shell_code}`);
  console.log('Payload:', updated.payload);
  console.log('✅ Test metadata successfully healed!');
}

heal().catch(console.error);

