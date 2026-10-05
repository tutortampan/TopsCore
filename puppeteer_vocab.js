import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Go to admin page
  console.log('Navigating to http://127.0.0.1:5500/admin.html...');
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle0' });

  console.log('Executing automation script in browser context...');
  const result = await page.evaluate(async () => {
      try {
         // Import API directly from the served files
         const api = await import('./js/api.js?v=' + Date.now());
         const { getSupabase } = await import('./js/supabase.js?v=' + Date.now());
         const sb = await getSupabase();
         
         const { data: classes } = await sb.from('classes').select('*, class_levels(levels(*))');
         const vocabClasses = classes.filter(c => (c.name || '').toLowerCase().includes('vocab'));
         
         const results = [];
         
         for (const c of vocabClasses) {
            let levelId = c.level_id;
            let levelNum = 1;
            if (c.class_levels && c.class_levels.length > 0) {
               levelId = c.class_levels[0].levels.id;
               levelNum = c.class_levels[0].levels.level_number;
            } else {
               const { data: lData } = await sb.from('levels').select('*').eq('id', levelId).single();
               levelNum = lData ? lData.level_number : 1;
            }
            
            if (levelNum > 3) continue;
            
            const { data: topics } = await sb.from('vocabulary_vault')
               .select('topic')
               .eq('target_level', levelNum);
               
            const uniqueTopics = [...new Set(topics.map(t => t.topic))].filter(Boolean);
            
            if (uniqueTopics.length === 0) {
               results.push(`Skipping Level ${levelNum} (${c.name}) - No topics found in Vault.`);
               continue;
            }
            
            const topicVocab = uniqueTopics[0];
            const topicPhrase = uniqueTopics.length > 1 ? uniqueTopics[1] : uniqueTopics[0];
            
            results.push(`Starting Assembly for ${c.name} (Level ${levelNum})...`);
            
            const vocabRes = await api.createVocabMasteryAssessment({
               classId: c.id,
               levelId: levelId,
               tier: 'TASK',
               assessment_category: 'TASK',
               category: 'TASK',
               title: `Vocab Drill: ${topicVocab}`,
               assessmentType: 'VOCAB_MASTERY',
               sourceTopic: topicVocab,
               questionOrder: 'random',
               scheduleMode: 'batch'
            });
            results.push(`  -> Created TASK (Vocab): ${vocabRes.assessmentId}`);
            
            const phraseRes = await api.createVocabMasteryAssessment({
               classId: c.id,
               levelId: levelId,
               tier: 'TASK',
               assessment_category: 'TASK',
               category: 'TASK',
               title: `Phrase Drill: ${topicPhrase}`,
               assessmentType: 'PHRASE_RECOGNITION',
               sourceTopic: topicPhrase,
               questionOrder: 'random',
               scheduleMode: 'batch'
            });
            results.push(`  -> Created TASK (Phrase): ${phraseRes.assessmentId}`);
            
            const testRes = await api.createVocabMasteryAssessment({
               classId: c.id,
               levelId: levelId,
               tier: 'TEST',
               assessment_category: 'TEST',
               category: 'TEST',
               title: `Theme Mastery Test: Level ${levelNum}`,
               assessmentType: 'VOCAB_MASTERY',
               sourceTaskIds: [vocabRes.assessmentId, phraseRes.assessmentId],
               questionOrder: 'random',
               scheduleMode: 'batch'
            });
            results.push(`  -> Created TEST (Mastery): ${testRes.assessmentId}`);
         }
         return results;
      } catch (e) {
         return { error: e.message, stack: e.stack };
      }
  });
  
  console.log(result);
  await browser.close();
})();
