import fs from 'fs';
import path from 'path';

// --- POLYFILLS ---
global.fetch = fetch;
global.window = {
  __ENV__: undefined,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {}
  }
};
global.localStorage = global.window.localStorage;
global.sessionStorage = global.window.localStorage;
global.document = {
  cookie: ''
};

// --- GET SUPABASE CREDENTIALS ---
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const urlMatch = config.match(/SUPABASE_URL\s*=\s*window.__ENV__\?.SUPABASE_URL\s*\|\|\s*['"]([^'"]+)['"]/);
const keyMatch = config.match(/SUPABASE_ANON_KEY\s*=\s*window.__ENV__\?.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/);

if (!urlMatch || !keyMatch) {
    console.error("Could not parse supabase credentials from js/supabase.js");
    process.exit(1);
}
global.window.__ENV__ = {
  SUPABASE_URL: urlMatch[1],
  SUPABASE_ANON_KEY: keyMatch[1]
};

// Import APIs
const api = await import('file:///d:/TopsCore/js/api.js?v=' + Date.now());
const { getSupabase } = await import('file:///d:/TopsCore/js/supabase.js?v=' + Date.now());

(async () => {
  const sb = await getSupabase();
  console.log('Connected to Supabase. Starting tests...');
  
  for (let iteration = 1; iteration <= 3; iteration++) {
    console.log(`\n=== ITERATION ${iteration} ===`);
    try {
        // 1. IMPORT EXCEL MOCK
        console.log(`[Iter ${iteration}] 1. Importing questions...`);
        const mockRows = [
          { level: '1', theme_code: `T${iteration}`, theme: `Theme ${iteration}`, topic_code: `TOP${iteration}`, topic: `Topic ${iteration}`, indonesian: `Indo ${iteration}A`, english: `Eng ${iteration}A`, word_type: 'Vocab' },
          { level: '1', theme_code: `T${iteration}`, theme: `Theme ${iteration}`, topic_code: `TOP${iteration}`, topic: `Topic ${iteration}`, indonesian: `Indo ${iteration}B`, english: `Eng ${iteration}B`, word_type: 'Vocab' },
        ];
        const importRes = await api.importVaultWords(mockRows, {});
        console.log(`[Iter ${iteration}] Imported: ${importRes.inserted} inserted, ${importRes.updated} updated.`);
        
        // 2. EXPORT EXCEL
        console.log(`[Iter ${iteration}] 2. Exporting Excel (triggering API)...`);
        const exportData = await api.fetchVaultWords({ limit: 10000 });
        console.log(`[Iter ${iteration}] Export fetched ${exportData.length} words from vault.`);

        // 3. GENERATE SOAL
        console.log(`[Iter ${iteration}] 3. Generating assessments...`);
        const { data: programs } = await sb.from('programs').select('id, name').limit(1);
        if (!programs || programs.length === 0) throw new Error('No programs found to link assessments');
        const programId = programs[0].id;
        
        const genRes = await api.autoGenerateAssessmentsHierarchy([1], { programId });
        console.log(`[Iter ${iteration}] Auto-generated hierarchy. Created tests: ${genRes.testsCreated || 0}`);
        
        // 4. TEST SOAL
        const { data: assessments } = await sb.from('assessment_definitions')
          .select('id, title')
          .eq('tier', 'TEST')
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (assessments && assessments.length > 0) {
          const testId = assessments[0].id;
          console.log(`[Iter ${iteration}] Selected Test for playing: ${assessments[0].title} (ID: ${testId})`);
          
          console.log(`[Iter ${iteration}] 4. Simulating student taking the test...`);
          const { data: students } = await sb.from('students').select('id, name').limit(1);
          if (students && students.length > 0) {
            const studentId = students[0].id;
            
            const attempt = await api.startAssessment(studentId, testId);
            console.log(`[Iter ${iteration}] Started attempt: ${attempt.attemptId}`);
            
            const submitRes = await api.submitAssessment(attempt.attemptId, {});
            console.log(`[Iter ${iteration}] Submitted attempt. Score: ${submitRes.grade}`);
          } else {
            console.log(`[Iter ${iteration}] No students found to test the assessment.`);
          }
        } else {
          console.log(`[Iter ${iteration}] No tests found to simulate playing.`);
        }
    } catch (e) {
        console.error(`[Iter ${iteration}] ERROR:`, e.message);
        console.error(e.stack);
        break; 
    }
  }

  console.log('\nAll tests completed.');
})();
