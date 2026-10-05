const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

async function fetchDb(path, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + path, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`DB Error [${res.status}]: ${text}`);
  }
  return res.json();
}

// Generate UUID v4
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function assembleVocabClasses() {
  try {
    console.log('Fetching classes...');
    const classes = await fetchDb('classes?select=*,class_levels(levels(*))');
    const vocabClasses = classes.filter(c => 
      !c.deleted_at && 
      (c.name || '').trim().toLowerCase().startsWith('vocabulary')
    );
    
    for (const c of vocabClasses) {
      let levelId = c.level_id;
      let levelNum = 1;
      if (c.class_levels && c.class_levels.length > 0) {
         levelId = c.class_levels[0].levels.id;
         levelNum = c.class_levels[0].levels.level_number;
      } else {
         const levels = await fetchDb(`levels?id=eq.${levelId}&select=*`);
         if (levels.length > 0) levelNum = levels[0].level_number;
      }
      
      if (levelNum > 3) continue;
      
      console.log(`\n--- Assembling ${c.name} (Level ${levelNum}) ---`);
      
      // Fetch words for this level
      const words = await fetchDb(`vocabulary_vault?target_level=eq.${levelNum}&select=*`);
      if (words.length === 0) {
         console.log(`No words found in Vault for Level ${levelNum}. Skipping.`);
         continue;
      }
      
      const topics = [...new Set(words.map(w => w.topic))].filter(Boolean);
      const vocabTopic = topics[0] || 'General';
      const phraseTopic = topics.length > 1 ? topics[1] : vocabTopic;
      
      // We need to create tasks
      // 1. Task Vocab
      const vocabTask = {
        id: uuidv4(),
        class_id: c.id,
        title: `Daily Vocab Drill: ${vocabTopic}`,
        description: `Vocabulary task generated from Vault topic: ${vocabTopic}`,
        assessment_type: 'VOCAB_MASTERY',
        status: 'PUBLISHED',
        assessment_category: 'TASK'
      };
      
      // Insert vocab task
      console.log(`Inserting Task: ${vocabTask.title}`);
      const vTaskRes = await fetchDb('assessments', 'POST', vocabTask);
      
      // Get words for vocab topic
      const vWords = words.filter(w => w.topic === vocabTopic);
      // Insert questions
      const vQuestions = vWords.map((w, idx) => ({
         assessment_id: vocabTask.id,
         question_text_snapshot: w.indonesian,
         answer_type: 'written',
         accepted_answers_snapshot: (w.english || '').split(' / ').map(s => s.trim()),
         topic_snapshot: w.topic || 'General',
         word_type_snapshot: w.word_type || 'Verb',
         display_order: idx + 1
      }));
      await fetchDb('assessment_questions', 'POST', vQuestions);
      console.log(`Inserted ${vQuestions.length} questions for Vocab Task.`);

      // 2. Task Phrase
      const phraseTask = {
        id: uuidv4(),
        class_id: c.id,
        title: `Daily Phrase Drill: ${phraseTopic}`,
        description: `Phrase task generated from Vault topic: ${phraseTopic}`,
        assessment_type: 'PHRASE_RECOGNITION',
        status: 'PUBLISHED',
        assessment_category: 'TASK'
      };
      
      console.log(`Inserting Task: ${phraseTask.title}`);
      await fetchDb('assessments', 'POST', phraseTask);
      
      const pWords = words.filter(w => w.topic === phraseTopic);
      const pQuestions = pWords.map((w, idx) => ({
         assessment_id: phraseTask.id,
         question_text_snapshot: w.indonesian,
         answer_type: 'dropdown',
         accepted_answers_snapshot: (w.english || '').split(' / ').map(s => s.trim()),
         options_snapshot: [(w.english || '').split(' / ')[0].trim(), "Dummy Option A", "Dummy Option B"],
         topic_snapshot: w.topic || 'General',
         word_type_snapshot: w.word_type || 'Phrase',
         display_order: idx + 1
      }));
      await fetchDb('assessment_questions', 'POST', pQuestions);
      console.log(`Inserted ${pQuestions.length} questions for Phrase Task.`);

      // 3. Test Mastery
      const testMastery = {
        id: uuidv4(),
        class_id: c.id,
        title: `Theme Mastery Test: Level ${levelNum}`,
        description: `Aggregated mastery test for Level ${levelNum}`,
        assessment_type: 'VOCAB_MASTERY',
        status: 'PUBLISHED',
        assessment_category: 'TEST',
        prerequisite_id: phraseTask.id // gating
      };
      console.log(`Inserting Test: ${testMastery.title}`);
      await fetchDb('assessments', 'POST', testMastery);
      
      const tWords = [...vWords, ...pWords];
      const tQuestions = tWords.map((w, idx) => ({
         assessment_id: testMastery.id,
         question_text_snapshot: w.indonesian,
         answer_type: 'written',
         accepted_answers_snapshot: (w.english || '').split(' / ').map(s => s.trim()),
         topic_snapshot: w.topic || 'General',
         word_type_snapshot: w.word_type || 'Verb',
         display_order: idx + 1
      }));
      await fetchDb('assessment_questions', 'POST', tQuestions);
      console.log(`Inserted ${tQuestions.length} questions for Mastery Test.`);
      
      console.log(`Successfully assembled Level ${levelNum}`);
    }
  } catch(e) {
    console.error('Error assembling classes:', e);
  }
}
assembleVocabClasses();
