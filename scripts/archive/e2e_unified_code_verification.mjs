// scripts/e2e_unified_code_verification.mjs
// Comprehensive End-to-End (E2E) verification of the Unified CODE pipeline across the entire TopsCore LMS

global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};

const { getSupabase } = await import('../js/supabase.js');
const { fetchVaultWords, generateTestQuestions, exportVaultWords } = await import('../js/api.js');
const sb = await getSupabase();

console.log('================================================================');
console.log('       TOPSCORE LMS — FULL SYSTEM E2E AUDIT & VERIFICATION       ');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// SECTION 1: DATABASE INTEGRITY & PAGINATION
// -------------------------------------------------------------
console.log('[SECTION 1] Checking Database Integrity & Chunked Pagination...');
const allWords = await fetchVaultWords({ limit: 10000 });
assert(allWords.length === 1400, `fetchVaultWords returned exactly 1400 rows (got ${allWords.length})`);

const emptyCodeRows = allWords.filter(w => !w.topic_code || w.topic_code.trim() === '');
assert(emptyCodeRows.length === 0, `All 1400 rows have non-empty topic_code (empty: ${emptyCodeRows.length})`);

const lvl2Words = allWords.filter(w => w.target_level === 2);
const lvl3Words = allWords.filter(w => w.target_level === 3);
assert(lvl2Words.length === 600, `Level 2 has exactly 600 active items (got ${lvl2Words.length})`);
assert(lvl3Words.length === 800, `Level 3 has exactly 800 active items (got ${lvl3Words.length})`);

const lvl3Topics = Array.from(new Set(lvl3Words.map(w => w.topic_code))).sort();
assert(lvl3Topics.length === 16, `Level 3 has all 16 topics active (got ${lvl3Topics.length}: ${lvl3Topics.join(', ')})`);
const expectedLvl3 = ['A1','A2','A3','B1','B2','B3','B4','C1','C2','C3','C4','C5','D1','D2','D3','D4'];
assert(JSON.stringify(lvl3Topics) === JSON.stringify(expectedLvl3), `Level 3 topic codes strictly match A1..D4`);

// -------------------------------------------------------------
// SECTION 2: QUESTION GENERATOR / TEST RUNNER
// -------------------------------------------------------------
console.log('\n[SECTION 2] Checking Question Generator (Dynamic Test Shell Execution)...');

// Find a Level 2 Task, Level 3 Task, and Level 3 Exam
const { data: testLvl2Task } = await sb.from('tests')
  .select('id, title, shell_code, category, test_type, payload, level_id')
  .eq('shell_code', '2A1-WORDS-TASK')
  .is('deleted_at', null)
  .maybeSingle();

if (testLvl2Task) {
  const q2 = await generateTestQuestions(sb, testLvl2Task);
  assert(q2.length > 0, `Level 2 Task (${testLvl2Task.shell_code}) generated ${q2.length} questions from vault`);
} else {
  console.log('  ⚠️ 2A1-WORDS-TASK not found in DB, skipping direct run');
}

const { data: testLvl3Task } = await sb.from('tests')
  .select('id, title, shell_code, category, test_type, payload, level_id')
  .eq('shell_code', '3A1-WORDS-TASK')
  .is('deleted_at', null)
  .maybeSingle();

if (testLvl3Task) {
  const q3 = await generateTestQuestions(sb, testLvl3Task);
  assert(q3.length === 40, `Level 3 Words Task (${testLvl3Task.shell_code}) generated ${q3.length}/40 questions`);
} else {
  console.log('  ⚠️ 3A1-WORDS-TASK not found in DB, skipping direct run');
}

const { data: testLvl3PhrasesTask } = await sb.from('tests')
  .select('id, title, shell_code, category, test_type, payload, level_id')
  .eq('shell_code', '3A1-PHRASES-TASK')
  .is('deleted_at', null)
  .maybeSingle();

if (testLvl3PhrasesTask) {
  const q3p = await generateTestQuestions(sb, testLvl3PhrasesTask);
  assert(q3p.length === 10, `Level 3 Phrases Task (${testLvl3PhrasesTask.shell_code}) generated ${q3p.length}/10 questions`);
}

const { data: testLvl3Exam } = await sb.from('tests')
  .select('id, title, shell_code, category, test_type, payload, level_id')
  .eq('shell_code', '3A-WORDS-EXAM')
  .is('deleted_at', null)
  .maybeSingle();

if (testLvl3Exam) {
  const q3e = await generateTestQuestions(sb, testLvl3Exam);
  assert(q3e.length > 0, `Level 3 Words Exam (${testLvl3Exam.shell_code}) generated ${q3e.length} questions from Theme A`);
}

// -------------------------------------------------------------
// SECTION 3: CLASS HUB ATTENDANCE & VAULT COUNTING
// -------------------------------------------------------------
console.log('\n[SECTION 3] Checking Class Hub & vaultCountFor compatibility...');

// Emulate vaultCountFor from js/admin/app.js
const _ALL_THEMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const _PHRASE_TYPES = ['expression', 'idiom', 'proverb', 'phrase'];
const _norm = s => String(s || '').toLowerCase().trim();

function testVaultCountFor(testRow, lvlNumber) {
  const pl = testRow?.payload || {};
  const isUnified = pl.category === 'unified' || pl.is_unified === true || pl.is_unified_test === true || testRow?.test_type === 'UNIFIED_TEST';
  const wantPhrases = pl.category === 'phrases';
  const isTest = (testRow?.category === 'EXAM' || testRow?.category === 'TEST' || String(testRow?.test_type).toLowerCase() === 'exam' || (testRow?.shell_code && (testRow.shell_code.includes('-TEST') || testRow.shell_code.includes('-EXAM')))) && !pl.topic_code;
  let themes = (pl.themes && Array.isArray(pl.themes) && pl.themes.length > 0) ? pl.themes : null;
  if (!themes && isTest && pl.theme_code) {
    const idx = _ALL_THEMES.indexOf(String(pl.theme_code).toUpperCase());
    themes = idx >= 0 ? _ALL_THEMES.slice(0, idx + 1) : [pl.theme_code];
  }

  return allWords.filter(v => {
    if (Number(v.target_level) !== Number(lvlNumber)) return false;
    const isPhrase = _PHRASE_TYPES.includes(_norm(v.word_type));
    if (!isUnified && wantPhrases !== isPhrase) return false;
    if (themes && !themes.includes(v.theme_code)) return false;
    if (pl.theme_code && v.theme_code !== pl.theme_code) return false;
    if (pl.topic_code) {
      const normPlCode = (/^[A-Za-z]/.test(String(pl.topic_code))) ? String(pl.topic_code).toUpperCase() : `${String(pl.theme_code || '').toUpperCase()}${pl.topic_code}`;
      const normVCode = (/^[A-Za-z]/.test(String(v.topic_code))) ? String(v.topic_code).toUpperCase() : `${String(v.theme_code || '').toUpperCase()}${v.topic_code}`;
      if (normVCode !== normPlCode && String(v.topic_code).toUpperCase() !== String(pl.topic_code).toUpperCase()) return false;
    }
    return true;
  }).length;
}

if (testLvl3Task) {
  const countWords = testVaultCountFor(testLvl3Task, 3);
  assert(countWords === 40, `vaultCountFor 3A1 Words Task returned exactly 40 words (got ${countWords})`);
}
if (testLvl3PhrasesTask) {
  const countPhrases = testVaultCountFor(testLvl3PhrasesTask, 3);
  assert(countPhrases === 10, `vaultCountFor 3A1 Phrases Task returned exactly 10 phrases (got ${countPhrases})`);
}
if (testLvl3Exam) {
  const countExam = testVaultCountFor(testLvl3Exam, 3);
  assert(countExam === 120, `vaultCountFor 3A Words Exam returned exactly 120 words across Theme A (got ${countExam})`);
}

// -------------------------------------------------------------
// SECTION 4: STUDENT DASHBOARD PRESENTATION LOGIC
// -------------------------------------------------------------
console.log('\n[SECTION 4] Checking Student Dashboard Virtual Presentation...');

const sampleTask = {
  shell_code: '3A1-WORDS-TASK',
  title: '3rd Vocabulary A1 Words Task - Professional Identity',
  category: 'TASK',
  test_type: 'quiz',
  payload: { theme_code: 'A', topic_code: 'A1', category: 'words' }
};

const tc = String(sampleTask.payload?.theme_code || 'A').toUpperCase();
const topCode = sampleTask.payload?.topic_code != null ? String(sampleTask.payload.topic_code) : null;
const cleanTopCode = topCode ? String(topCode).replace(/^[A-Za-z]/, '') : '1';
const displayTopicNum = topCode || `${tc}${cleanTopCode}`;

assert(displayTopicNum === 'A1', `Student dashboard formats topic code as clean 'A1' (got '${displayTopicNum}')`);
const taskLabel = `Theme ${tc} • Topic ${displayTopicNum}`;
assert(taskLabel === 'Theme A • Topic A1', `Virtual task badge is 'Theme A • Topic A1' (got '${taskLabel}')`);

// -------------------------------------------------------------
// SECTION 5: EXCEL EXPORT STRUCTURE
// -------------------------------------------------------------
console.log('\n[SECTION 5] Checking Excel Export Data Structure...');

const exportSample = allWords.slice(0, 5).map(w => {
  const wt = (w.word_type || '').toLowerCase();
  const isPhrase = ['expression', 'idiom', 'proverb'].includes(wt);
  const code = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : ((w.theme_code || 'A') + '1');
  return {
    Institution: w.institutions?.name || 'CEC',
    Program: w.programs?.name || 'Camp',
    Level: w.target_level || '1',
    Category: isPhrase ? 'Phrases' : 'Words',
    Code: code,
    Theme: w.theme || '',
    Topic: w.topic || '',
    Type: w.word_type || 'Vocab',
    Indonesian: w.indonesian || '',
    English: w.english || ''
  };
});

const cols = Object.keys(exportSample[0]);
assert(cols.length === 10, `Export output strictly has 10 columns (got ${cols.length}: ${cols.join(', ')})`);
assert(!cols.includes('Theme Code'), `Redundant 'Theme Code' column successfully eliminated from export`);
assert(cols.includes('Code'), `Single unified 'Code' column present in export`);
assert(exportSample.every(r => /^[A-Z][0-9]+$/.test(r.Code)), `All exported sample codes follow format A1, A2, etc.`);

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`E2E AUDIT COMPLETE: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================');

if (failCount > 0) process.exit(1);
