import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CEC_INSTITUTION_ID = 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447';
const CAMP_PROGRAM_ID = '11deb53c-434a-44b0-83ca-1cc9b239cab3';
const LEVEL_2_ID = '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71'; // 2nd Level
const CLASS_2ND_VOCAB_ID = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';

async function main() {
  console.log('--- Phase 4: Activating 2nd Vocabulary & Batch 134 ---');

  // 1. Reactivate 2nd Vocabulary class
  const { data: updatedClass, error: cErr } = await sb.from('classes')
    .update({
      code: 'VOCAB_2ND',
      name: '2nd Vocabulary',
      level_id: LEVEL_2_ID,
      program_id: CAMP_PROGRAM_ID,
      is_active: true,
      deleted_at: null
    })
    .eq('id', CLASS_2ND_VOCAB_ID)
    .select();

  if (cErr) {
    console.error('Failed to reactivate 2nd Vocabulary class:', cErr);
    process.exit(1);
  }
  console.log('✓ Reactivated 2nd Vocabulary class:', updatedClass[0]);

  // 2. Connect Batch 134 to 2nd Level
  // Check if Batch 134 exists
  const { data: existingBatch } = await sb.from('batches')
    .select('id, name')
    .eq('program_id', CAMP_PROGRAM_ID)
    .eq('name', '134')
    .maybeSingle();

  let batch134Id;
  if (existingBatch) {
    batch134Id = existingBatch.id;
    const { error: bErr } = await sb.from('batches')
      .update({
        current_level_id: LEVEL_2_ID,
        is_active: true,
        deleted_at: null
      })
      .eq('id', batch134Id);
    if (bErr) throw bErr;
    console.log(`✓ Updated existing Batch 134 (${batch134Id}) -> level: 2nd Level`);
  } else {
    const { data: newBatch, error: bErr } = await sb.from('batches')
      .insert({
        name: '134',
        program_id: CAMP_PROGRAM_ID,
        current_level_id: LEVEL_2_ID,
        is_active: true,
        deleted_at: null
      })
      .select()
      .single();
    if (bErr) throw bErr;
    batch134Id = newBatch.id;
    console.log(`✓ Created new Batch 134 (${batch134Id}) -> level: 2nd Level`);
  }

  // 3. Verify Theme A & B curriculum is strictly Words-Only
  // Check vocabulary_vault for target_level = 2
  const { data: l2Items } = await sb.from('vocabulary_vault')
    .select('id, category, theme_code')
    .eq('target_level', 2);

  console.log(`Existing Level 2 items in vault: ${l2Items?.length || 0}`);
  const phraseItems = (l2Items || []).filter(i => i.category === 'phrases');
  if (phraseItems.length > 0) {
    console.warn(`WARNING: Found ${phraseItems.length} phrases in Level 2! Purging phrases to enforce Words-Only...`);
    await sb.from('vocabulary_vault')
      .delete()
      .eq('target_level', 2)
      .eq('category', 'phrases');
  }

  // If level 2 has no words in vault, add foundational Theme A & Theme B words
  if (!l2Items || l2Items.length === 0) {
    console.log('Seeding Theme A & Theme B Words-Only curriculum into vocabulary_vault for Level 2...');
    const themeAWords = [
      { topic: 'Daily Office Life', indonesian: 'Menghadiri', english: 'Attend', word_type: 'Verb', theme: 'Workplace Basics', theme_code: 'A', topic_code: '1' },
      { topic: 'Daily Office Life', indonesian: 'Jadwal', english: 'Schedule', word_type: 'Noun', theme: 'Workplace Basics', theme_code: 'A', topic_code: '1' },
      { topic: 'Daily Office Life', indonesian: 'Tepat Waktu', english: 'Punctual', word_type: 'Adjective', theme: 'Workplace Basics', theme_code: 'A', topic_code: '1' },
      { topic: 'Daily Office Life', indonesian: 'Tugas', english: 'Task', word_type: 'Noun', theme: 'Workplace Basics', theme_code: 'A', topic_code: '1' },
      { topic: 'Daily Office Life', indonesian: 'Menyelesaikan', english: 'Complete', word_type: 'Verb', theme: 'Workplace Basics', theme_code: 'A', topic_code: '1' },
      { topic: 'Customer Service', indonesian: 'Melayani', english: 'Serve', word_type: 'Verb', theme: 'Workplace Basics', theme_code: 'A', topic_code: '2' },
      { topic: 'Customer Service', indonesian: 'Pelanggan', english: 'Customer', word_type: 'Noun', theme: 'Workplace Basics', theme_code: 'A', topic_code: '2' },
      { topic: 'Customer Service', indonesian: 'Sopan', english: 'Polite', word_type: 'Adjective', theme: 'Workplace Basics', theme_code: 'A', topic_code: '2' },
      { topic: 'Customer Service', indonesian: 'Keluhan', english: 'Complaint', word_type: 'Noun', theme: 'Workplace Basics', theme_code: 'A', topic_code: '2' },
      { topic: 'Customer Service', indonesian: 'Membantu', english: 'Assist', word_type: 'Verb', theme: 'Workplace Basics', theme_code: 'A', topic_code: '2' },
    ];

    const themeBWords = [
      { topic: 'Travel & Transport', indonesian: 'Keberangkatan', english: 'Departure', word_type: 'Noun', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '1' },
      { topic: 'Travel & Transport', indonesian: 'Kedatangan', english: 'Arrival', word_type: 'Noun', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '1' },
      { topic: 'Travel & Transport', indonesian: 'Memesan', english: 'Book / Reserve', word_type: 'Verb', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '1' },
      { topic: 'Travel & Transport', indonesian: 'Nyaman', english: 'Comfortable', word_type: 'Adjective', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '1' },
      { topic: 'Travel & Transport', indonesian: 'Tiket', english: 'Ticket', word_type: 'Noun', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '1' },
      { topic: 'Hospitality & Dining', indonesian: 'Memesan Makanan', english: 'Order', word_type: 'Verb', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '2' },
      { topic: 'Hospitality & Dining', indonesian: 'Lezat', english: 'Delicious', word_type: 'Adjective', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '2' },
      { topic: 'Hospitality & Dining', indonesian: 'Pelayan', english: 'Waiter / Server', word_type: 'Noun', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '2' },
      { topic: 'Hospitality & Dining', indonesian: 'Tagihan', english: 'Bill / Check', word_type: 'Noun', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '2' },
      { topic: 'Hospitality & Dining', indonesian: 'Rekomendasi', english: 'Recommend', word_type: 'Verb', theme: 'Travel & Exploration', theme_code: 'B', topic_code: '2' },
    ];

    const seedWords = [...themeAWords, ...themeBWords].map(w => ({
      ...w,
      target_level: 2,
      category: 'words',
      institution_id: CEC_INSTITUTION_ID,
      program_id: CAMP_PROGRAM_ID
    }));

    const { error: insErr } = await sb.from('vocabulary_vault').insert(seedWords);
    if (insErr) {
      console.error('Failed to seed Level 2 words:', insErr);
    } else {
      console.log(`✓ Seeded ${seedWords.length} Level 2 Words (strictly Words-Only, 0 phrases)`);
    }
  }

  // 4. Verify Batch 134 automatically inherits 2nd Vocabulary
  const { data: batchClasses } = await sb.from('classes')
    .select('id, name, code, level_id')
    .eq('level_id', LEVEL_2_ID)
    .is('deleted_at', null);

  console.log(`Classes inherited by Batch 134 (Level 2):`);
  console.table(batchClasses);

  console.log('✅ Phase 4 Activation Complete!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
