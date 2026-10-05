import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  
  // Go to admin page
  console.log('Navigating to http://127.0.0.1:5500/admin.html...');
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle0' });

  for (let iteration = 1; iteration <= 3; iteration++) {
    console.log(`\n=== ITERATION ${iteration} ===`);
    
    const result = await page.evaluate(async (iter) => {
        const logs = [];
        const log = (msg) => logs.push(`[Iter ${iter}] ` + msg);
        try {
           const api = await import('./js/api.js?v=' + Date.now());
           const { getSupabase } = await import('./js/supabase.js?v=' + Date.now());
           const sb = await getSupabase();
           
           // 1. IMPORT EXCEL MOCK
           log('1. Importing questions...');
           const mockRows = [
             { level: '1', theme_code: `T${iter}`, theme: `Theme ${iter}`, topic_code: `TOP${iter}`, topic: `Topic ${iter}`, indonesian: `Indo ${iter}A`, english: `Eng ${iter}A`, word_type: 'Vocab' },
             { level: '1', theme_code: `T${iter}`, theme: `Theme ${iter}`, topic_code: `TOP${iter}`, topic: `Topic ${iter}`, indonesian: `Indo ${iter}B`, english: `Eng ${iter}B`, word_type: 'Vocab' },
           ];
           const importRes = await api.importVaultWords(mockRows, {});
           log(`Imported: ${importRes.inserted} inserted, ${importRes.updated} updated.`);
           
           // 2. EXPORT EXCEL
           log('2. Exporting Excel (triggering API)...');
           const exportData = await api.fetchVaultWords({ limit: 10000 });
           log(`Export fetched ${exportData.length} words from vault.`);

           // 3. GENERATE SOAL
           log('3. Generating assessments...');
           // Need a program ID to link
           const { data: programs } = await sb.from('programs').select('id, name').limit(1);
           if (!programs || programs.length === 0) throw new Error('No programs found to link assessments');
           const programId = programs[0].id;
           
           const genRes = await api.autoGenerateAssessmentsHierarchy([1], { programId });
           log(`Auto-generated hierarchy. Created tests: ${genRes.testsCreated || 0}`);
           
           // 4. TEST SOAL
           // Find one of the generated tests
           const { data: assessments } = await sb.from('assessment_definitions')
             .select('id, title')
             .eq('tier', 'TEST')
             .order('created_at', { ascending: false })
             .limit(1);
             
           if (assessments && assessments.length > 0) {
             const testId = assessments[0].id;
             log(`Selected Test for playing: ${assessments[0].title} (ID: ${testId})`);
             
             log('4. Simulating student taking the test...');
             // Get a random student
             const { data: students } = await sb.from('students').select('id, name').limit(1);
             if (students && students.length > 0) {
               const studentId = students[0].id;
               
               // Start assessment
               const attempt = await api.startAssessment(studentId, testId);
               log(`Started attempt: ${attempt.attemptId}`);
               
               // Submit empty/random answers (0 points)
               const submitRes = await api.submitAssessment(attempt.attemptId, {});
               log(`Submitted attempt. Score: ${submitRes.grade}`);
             } else {
               log('No students found to test the assessment.');
             }
           } else {
             log('No tests found to simulate playing.');
           }
           
           return { success: true, logs };
        } catch (e) {
           return { success: false, logs, error: e.message, stack: e.stack };
        }
    }, iteration);
    
    console.log(result.logs.join('\n'));
    if (!result.success) {
      console.error('ERROR:', result.error);
      console.error(result.stack);
      break; 
    }
  }

  await browser.close();
  console.log('\nAll tests completed.');
})();
