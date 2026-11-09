import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  console.log('--- Applying Phase 3 Updates to Database ---');

  // Fetch all 8 exams
  const { data: exams, error } = await sb.from('tests')
    .select('id, title, shell_code, answer_type, minimum_required_score, payload')
    .ilike('title', '%Exam%')
    .is('deleted_at', null);

  if (error) {
    console.error('Error fetching exams:', error);
    process.exit(1);
  }

  console.log(`Found ${exams.length} exams.`);

  for (const ex of exams) {
    const isWordsExam = (ex.shell_code || '').includes('WORDS') || (ex.title || '').toLowerCase().includes('word');
    const newPayload = { ...(ex.payload || {}), minimum_required_score: 70 };
    if (isWordsExam) {
      newPayload.answer_type = 'written';
    }

    const updateData = {
      minimum_required_score: 70,
      payload: newPayload
    };
    if (isWordsExam) {
      updateData.answer_type = 'written';
    }

    const { error: uErr } = await sb.from('tests').update(updateData).eq('id', ex.id);
    if (uErr) {
      console.error(`Failed to update ${ex.title}:`, uErr);
    } else {
      console.log(`✓ Updated ${ex.title} (${ex.shell_code}) -> min_score: 70${isWordsExam ? ', answer_type: written' : ''}`);
    }
  }

  // Also check if any other tests have Words Exam or Phrases Exam in other classes (e.g. 2nd Vocabulary)
  console.log('\n--- Verifying Updated Records ---');
  const { data: updatedExams } = await sb.from('tests')
    .select('id, title, shell_code, answer_type, minimum_required_score, payload')
    .ilike('title', '%Exam%')
    .is('deleted_at', null);

  console.table(updatedExams.map(t => ({
    title: t.title,
    shell_code: t.shell_code,
    answer_type: t.answer_type,
    payload_answer_type: t.payload?.answer_type,
    min_score: t.minimum_required_score,
    payload_min_score: t.payload?.minimum_required_score
  })));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
