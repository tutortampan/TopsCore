import fs from 'fs';

// Mock window and browser globals before importing anything else
global.window = {
  __ENV__: {
    SUPABASE_URL: 'https://xuiszvwfjccvucqpactf.supabase.co'
  }
};
global.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

// Now dynamic import the test logic so the globals apply
(async () => {
  try {
    const api = await import('./js/api.js');
    const { importVaultWords, autoGenerateAssessmentsHierarchy, fetchAssessments, fetchInstitutions, fetchPrograms } = api;

    const log = (msg) => { console.log(msg); };
    
    log('Starting automated Excel Data Import mapping test...');
    
    const mockRows = [
      {
        level: '99',
        theme_code: 'TEST_TH_1',
        theme: 'Automated Test Theme',
        topic_code: 'TEST_TP_1',
        topic: 'Automated Test Topic',
        category: 'Word',
        word_type: 'Noun',
        indonesian: 'Kucing Uji',
        english: 'Test Cat',
        _isPhrase: false
      }
    ];
    
    log('Mocking importVaultWords...');
    const importRes = await importVaultWords(mockRows, {});
    log('Import result: ' + JSON.stringify(importRes));
    
    log('Generating assessment hierarchy for level 99...');
    
    const insts = await fetchInstitutions();
    const instId = insts[0].id;
    const progs = await fetchPrograms(instId);
    const progId = progs[0].id;

    const syncRes = await autoGenerateAssessmentsHierarchy([99], { programId: progId, institutionId: instId });
    log('Sync result: ' + JSON.stringify(syncRes));

    log('Fetching generated assessments for level 99...');
    const assessments = await fetchAssessments({ program_id: progId });
    const testAss = assessments.find(a => a.level == 99 && a.name.includes('Automated Test Theme'));
    
    if (testAss) {
      log('SUCCESS: Real-time sync works! Found generated assessment: ' + testAss.name);
    } else {
      log('FAILED: Generated assessment not found in fetch.');
    }

  } catch (err) {
    console.error(err);
  }
})();
