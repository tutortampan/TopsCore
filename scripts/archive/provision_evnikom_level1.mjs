global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
};
global.document = {
  documentElement: {},
  addEventListener: () => {},
  getElementById: () => null
};

const { getSupabase } = await import('../js/supabase.js');
const { autoGenerateTestsHierarchy } = await import('../js/api.js');

async function provisionEvnikom() {
  console.log('=== PROVISIONING EVNIKOM LEVEL 1 (PHASE 3, 4, 5) ===\n');
  const sb = await getSupabase();

  const TOP_INSTITUTION_ID = '637fea53-ca64-4e1c-8ff7-6fd4dbdd8260';
  const LEVEL_1_ID = '100120f3-ab12-4589-99da-cf65d11436b1';

  // 1. Verify Institution TOP
  const { data: topInst, error: instErr } = await sb
    .from('institutions')
    .select('id, name, code')
    .eq('id', TOP_INSTITUTION_ID)
    .single();

  if (instErr || !topInst) {
    throw new Error(`TOP Institution (${TOP_INSTITUTION_ID}) not found!`);
  }
  console.log(`[1] Institution verified: ${topInst.name} (${topInst.id})`);

  // 2. Ensure Program: Evnikom
  let { data: evnikomProg } = await sb
    .from('programs')
    .select('id, name, code, institution_id')
    .or(`code.eq.EVNIKOM,name.ilike.Evnikom`)
    .maybeSingle();

  if (!evnikomProg) {
    console.log('  Creating Program: Evnikom...');
    const { data: newProg, error: pErr } = await sb
      .from('programs')
      .insert({
        institution_id: TOP_INSTITUTION_ID,
        name: 'Evnikom',
        code: 'EVNIKOM',
        description: 'Evnikom Language Program',
        is_active: true
      })
      .select('id, name, code, institution_id')
      .single();

    if (pErr) throw new Error(`Failed to create Evnikom program: ${pErr.message}`);
    evnikomProg = newProg;
    console.log(`  ✅ Program created: ${evnikomProg.name} (${evnikomProg.id})`);
  } else {
    console.log(`[2] Program exists: ${evnikomProg.name} (${evnikomProg.id})`);
    // Ensure active and correct institution
    if (!evnikomProg.is_active || evnikomProg.institution_id !== TOP_INSTITUTION_ID) {
      await sb.from('programs').update({ is_active: true, institution_id: TOP_INSTITUTION_ID, code: 'EVNIKOM' }).eq('id', evnikomProg.id);
    }
  }

  // 3. Ensure Class: 1st Vocabulary for Evnikom
  let { data: evClass } = await sb
    .from('classes')
    .select('id, name, code, level_id, program_id, institution_id, is_active')
    .eq('program_id', evnikomProg.id)
    .eq('level_id', LEVEL_1_ID)
    .is('deleted_at', null)
    .maybeSingle();

  if (!evClass) {
    console.log('  Creating Class: 1st Vocabulary for Evnikom...');
    const { data: newClass, error: cErr } = await sb
      .from('classes')
      .insert({
        institution_id: TOP_INSTITUTION_ID,
        program_id: evnikomProg.id,
        level_id: LEVEL_1_ID,
        name: '1st Vocabulary',
        code: 'EV_VOCAB_1',
        description: 'Evnikom 1st Level Vocabulary & Phrases Class',
        is_active: true,
        status: 'active'
      })
      .select('id, name, code, level_id, program_id, institution_id, is_active')
      .single();

    if (cErr) throw new Error(`Failed to create Evnikom class: ${cErr.message}`);
    evClass = newClass;
    console.log(`  ✅ Class created: ${evClass.name} (${evClass.id})`);
  } else {
    console.log(`[3] Class exists: ${evClass.name} (${evClass.id})`);
    if (!evClass.is_active || !evClass.code) {
      await sb.from('classes').update({ is_active: true, code: 'EV_VOCAB_1', institution_id: TOP_INSTITUTION_ID }).eq('id', evClass.id);
    }
  }

  // 4. Ensure initial Batch: EV-01
  let { data: evBatch } = await sb
    .from('batches')
    .select('id, name, program_id, current_level_id, is_active')
    .eq('program_id', evnikomProg.id)
    .ilike('name', 'EV-01')
    .is('deleted_at', null)
    .maybeSingle();

  if (!evBatch) {
    console.log('  Creating Batch: EV-01...');
    const { data: newBatch, error: bErr } = await sb
      .from('batches')
      .insert({
        program_id: evnikomProg.id,
        name: 'EV-01',
        current_level_id: LEVEL_1_ID,
        is_active: true
      })
      .select('id, name, program_id, current_level_id, is_active')
      .single();

    if (bErr) throw new Error(`Failed to create batch EV-01: ${bErr.message}`);
    evBatch = newBatch;
    console.log(`  ✅ Batch created: ${evBatch.name} (${evBatch.id})`);
  } else {
    console.log(`[4] Batch exists: ${evBatch.name} (${evBatch.id})`);
  }

  // 4b. Ensure test student in EV-01
  let { data: evStudent } = await sb
    .from('students')
    .select('id, name, batch_id, program_id, institution_id, level_id')
    .eq('batch_id', evBatch.id)
    .ilike('name', '%Evnikom%')
    .is('deleted_at', null)
    .maybeSingle();

  if (!evStudent) {
    console.log('  Creating test student for Evnikom...');
    const { data: newStud, error: sErr } = await sb
      .from('students')
      .insert({
        institution_id: TOP_INSTITUTION_ID,
        program_id: evnikomProg.id,
        batch_id: evBatch.id,
        level_id: LEVEL_1_ID,
        name: 'Mr. Test Evnikom',
        gender: 'male',
        pin_hash: '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
        photo_status: 'set',
        is_active: true
      })
      .select('id, name, batch_id, program_id, institution_id, level_id')
      .single();

    if (sErr) throw new Error(`Failed to create test student: ${sErr.message}`);
    evStudent = newStud;
    console.log(`  ✅ Test student created: ${evStudent.name} (${evStudent.id})`);
  } else {
    console.log(`[4b] Test student exists: ${evStudent.name} (${evStudent.id})`);
  }

  // 5. Ensure sample vocabulary words for Evnikom Level 1
  const { data: existingWords } = await sb
    .from('vocabulary_vault')
    .select('id, indonesian, english')
    .eq('program_id', evnikomProg.id)
    .eq('target_level', 1)
    .is('deleted_at', null);

  const sampleEvnikomWords = [
    // Theme A, Topic A1 - Words
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'words', word_type: 'Expression', indonesian: 'Halo', english: 'Hello / Hi' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'words', word_type: 'Expression', indonesian: 'Selamat pagi', english: 'Good morning' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'words', word_type: 'Expression', indonesian: 'Terima kasih', english: 'Thank you / Thanks' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'words', word_type: 'Expression', indonesian: 'Sama-sama', english: 'You are welcome / Welcome' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'words', word_type: 'Verb', indonesian: 'Memperkenalkan', english: 'Introduce' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'words', word_type: 'Noun', indonesian: 'Nama', english: 'Name' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'words', word_type: 'Noun', indonesian: 'Teman', english: 'Friend' },

    // Theme A, Topic A1 - Phrases
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'phrases', word_type: 'Phrase', indonesian: 'Senang bertemu denganmu', english: 'Nice to meet you' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'phrases', word_type: 'Phrase', indonesian: 'Bagaimana kabarmu?', english: 'How are you?' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'phrases', word_type: 'Phrase', indonesian: 'Sampai jumpa besok', english: 'See you tomorrow' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Greetings & Basics', topic_code: 'A1', category: 'phrases', word_type: 'Phrase', indonesian: 'Hati-hati di jalan', english: 'Take care' },

    // Theme A, Topic A2 - Words
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'words', word_type: 'Verb', indonesian: 'Bangun tidur', english: 'Wake up' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'words', word_type: 'Verb', indonesian: 'Makan', english: 'Eat' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'words', word_type: 'Verb', indonesian: 'Minum', english: 'Drink' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'words', word_type: 'Verb', indonesian: 'Tidur', english: 'Sleep' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'words', word_type: 'Verb', indonesian: 'Belajar', english: 'Study / Learn' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'words', word_type: 'Noun', indonesian: 'Sarapan', english: 'Breakfast' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'words', word_type: 'Noun', indonesian: 'Buku', english: 'Book' },

    // Theme A, Topic A2 - Phrases
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'phrases', word_type: 'Phrase', indonesian: 'Tepat waktu', english: 'On time' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'phrases', word_type: 'Phrase', indonesian: 'Setiap hari', english: 'Every day' },
    { target_level: 1, theme: 'Foundational Communication', theme_code: 'A', topic: 'Daily Routine & Activities', topic_code: 'A2', category: 'phrases', word_type: 'Phrase', indonesian: 'Mempersiapkan diri', english: 'Get ready' }
  ];

  if (!existingWords || existingWords.length === 0) {
    console.log(`  Ingesting ${sampleEvnikomWords.length} sample words for Evnikom Level 1...`);
    const payload = sampleEvnikomWords.map(w => ({
      ...w,
      institution_id: TOP_INSTITUTION_ID,
      program_id: evnikomProg.id
    }));

    const { error: insErr } = await sb.from('vocabulary_vault').insert(payload);
    if (insErr) throw new Error(`Failed to ingest words: ${insErr.message}`);
    console.log(`  ✅ Ingested ${payload.length} vocabulary words for Evnikom!`);
  } else {
    console.log(`[5] Evnikom vocabulary vault has ${existingWords.length} Level 1 words.`);
  }

  // 6. Generate Tests Hierarchy for Evnikom Level 1
  console.log('\n[6] Auto-Generating Level 1 Test Hierarchy for Evnikom...');
  const genResult = await autoGenerateTestsHierarchy([1], {
    programId: evnikomProg.id,
    institutionId: TOP_INSTITUTION_ID,
    explicitClassId: evClass.id,
    wordsTaskDurationMinutes: 15,
    phrasesTaskDurationMinutes: 10,
    wordsTaskAnswerType: 'spoken',
    phrasesTaskAnswerType: 'spoken',
    taskPassingScore: 60,
    wordsTestAnswerType: 'written',
    phrasesTestAnswerType: 'selection',
    testPassingScore: 60
  });

  console.log(`  Auto-Gen Result:`, genResult);

  // 7. Verify generated tests
  const { data: genTests } = await sb
    .from('tests')
    .select('id, title, shell_code, test_type, category, class_id, program_id, level_id')
    .eq('program_id', evnikomProg.id)
    .eq('level_id', LEVEL_1_ID)
    .is('deleted_at', null)
    .order('display_order');

  console.log(`\n[7] Verified ${genTests?.length || 0} active tests for Evnikom Level 1:`);
  (genTests || []).forEach(t => {
    console.log(`  - [${t.shell_code}] ${t.title} (${t.test_type})`);
  });

  console.log('\n🎉 Evnikom Level 1 Provisioning & Content Generation COMPLETE!');
}

provisionEvnikom().catch(err => {
  console.error('PROVISIONING FAILED:', err);
  process.exit(1);
});
