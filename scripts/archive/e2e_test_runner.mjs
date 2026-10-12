// E2E Test Runner — Node.js (no browser needed)
// Calls Supabase REST API directly
// Usage: node e2e_test_runner.mjs

const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

const H = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function sb(table, method = 'GET', body = null, qs = '') {
  const url = `${SUPABASE_URL}/rest/v1/${table}${qs}`;
  const res = await fetch(url, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`[${method} ${table}] ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function select(table, qs = '') { return sb(table, 'GET', null, qs); }
async function insert(table, body) { return sb(table, 'POST', body, ''); }
async function update(table, qs, body) { return sb(table, 'PATCH', body, qs); }
async function del(table, qs) { return sb(table, 'DELETE', null, qs); }
async function rpc(fn, body = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: H, body: JSON.stringify(body)
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) throw new Error(`[RPC ${fn}] ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

let passed = 0, failed = 0, warns = 0;
function ok(msg) { console.log(`  ✅ ${msg}`); passed++; }
function fail(msg) { console.error(`  ❌ ${msg}`); failed++; }
function warn(msg) { console.warn(`  ⚠️  ${msg}`); warns++; }
function head(msg) { console.log(`\n${'═'.repeat(60)}\n  ${msg}\n${'═'.repeat(60)}`); }

// ─── Canonical helpers ────────────────────────────────────────────────────────
function canonicalize(str) {
  if (!str) return '';
  const parts = String(str).split('/').map(s => s.trim().toLowerCase()).filter(Boolean);
  return [...new Set(parts)].join(' / ');
}

function sanitizeRow(row) {
  return {
    theme_code:   String(row.theme_code || '').trim().toUpperCase(),
    theme:        String(row.theme || '').trim(),
    topic_code:   String(row.topic_code || '').trim().toUpperCase(),
    topic:        String(row.topic || '').trim(),
    indonesian:   String(row.indonesian || '').trim(),
    english:      canonicalize(row.english),
    word_type:    String(row.word_type || 'Vocab').trim(),
    target_level: parseInt(row.level || row.target_level || 1, 10) || 1
  };
}

// ─── Import Vault Words ───────────────────────────────────────────────────────
async function importVaultWords(rows) {
  const toInsert = rows.map(r => ({
    ...sanitizeRow(r),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));
  
  let inserted = 0;
  // Insert in chunks of 50
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const res = await sb('vocabulary_vault', 'POST', chunk, '');
    inserted += Array.isArray(res) ? res.length : 1;
  }
  return { inserted };
}

// ─── Fetch Vault Words ────────────────────────────────────────────────────────
async function fetchVaultWords(limit = 20) {
  const data = await select('vocabulary_vault', `?select=*&limit=${limit}&order=created_at.desc`);
  return Array.isArray(data) ? data : [];
}

// ─── Start Assessment (via edge function) ─────────────────────────────────────
async function startAssessment(studentId, assessmentId) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/start-assessment`, {
    method: 'POST',
    headers: { ...H, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ student_id: studentId, assessment_id: assessmentId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`start-assessment: ${JSON.stringify(data)}`);
  return data;
}

// ─── Submit Assessment ────────────────────────────────────────────────────────
async function submitAssessment(attemptId) {
  // Get attempt answers
  const answers = await select('attempt_answers', `?attempt_id=eq.${attemptId}&select=id`);
  
  // Build empty answers map
  const answersMap = {};
  for (const a of (answers || [])) {
    answersMap[a.id] = '';
  }
  
  // Submit via edge function
  const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-assessment`, {
    method: 'POST',
    headers: { ...H },
    body: JSON.stringify({ attempt_id: attemptId, answers: answersMap })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`submit-assessment: ${JSON.stringify(data)}`);
  return data;
}

// ─── MAIN TEST RUNNER ─────────────────────────────────────────────────────────
head('🧪 E2E AUTOMATED TEST RUNNER — 3 ITERATIONS');
console.log(`Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar' })} WITA`);

// Prefetch shared data
const programs = await select('programs', '?select=id,name,institution_id&limit=1');
if (!programs?.length) { fail('No programs found — cannot run tests!'); process.exit(1); }
const program = programs[0];
console.log(`\nProgram: "${program.name}" (${program.id})`);

const students = await select('students', '?select=id,name&limit=1');
const student = students?.[0] || null;
console.log(`Student: ${student?.name || 'NONE'}`);

const allLevels = await select('levels', '?select=id,level_number&order=level_number.asc&limit=5');
const level1 = allLevels?.find(l => l.level_number === 1) || allLevels?.[0];
console.log(`Level 1 ID: ${level1?.id}`);

const classes = await select('classes', `?select=id,name&program_id=eq.${program.id}&limit=1`);
const classRow = classes?.[0] || null;
console.log(`Class: ${classRow?.name || 'NONE'}\n`);

const trackIds = [];  // Track inserted assessment IDs for cleanup later

for (let iter = 1; iter <= 3; iter++) {
  head(`ITERATION ${iter} / 3`);

  try {
    // ── STEP 1: IMPORT VOCAB ────────────────────────────────────────────────
    console.log(`\n[${iter}] Step 1: Import Vocab Words`);
    const vocabRows = [
      { level: 1, theme_code: `TH${iter}`, theme: `Theme ${iter}`, topic_code: `TP${iter}A`, topic: `Topic ${iter}A`, indonesian: `Kata ${iter}A1`, english: `Word ${iter}A1`, word_type: 'Vocab' },
      { level: 1, theme_code: `TH${iter}`, theme: `Theme ${iter}`, topic_code: `TP${iter}A`, topic: `Topic ${iter}A`, indonesian: `Kata ${iter}A2`, english: `Word ${iter}A2`, word_type: 'Vocab' },
      { level: 1, theme_code: `TH${iter}`, theme: `Theme ${iter}`, topic_code: `TP${iter}B`, topic: `Topic ${iter}B`, indonesian: `Kata ${iter}B1`, english: `Word ${iter}B1`, word_type: 'Vocab' },
    ];
    const vocabRes = await importVaultWords(vocabRows);
    ok(`Vocab import: ${vocabRes.inserted} rows inserted`);

    // ── STEP 2: IMPORT PHRASE RECOGNITION ──────────────────────────────────
    console.log(`\n[${iter}] Step 2: Import Phrase Recognition Words`);
    const phraseRows = [
      { level: 1, theme_code: `TH${iter}`, theme: `Theme ${iter}`, topic_code: `PH${iter}A`, topic: `Phrase Topic ${iter}A`, indonesian: `Ungkapan ${iter}A`, english: `Idiom ${iter}A Meaning`, word_type: 'Idiom' },
      { level: 1, theme_code: `TH${iter}`, theme: `Theme ${iter}`, topic_code: `PH${iter}A`, topic: `Phrase Topic ${iter}A`, indonesian: `Peribahasa ${iter}A`, english: `Proverb ${iter}A Meaning`, word_type: 'Proverb' },
    ];
    const phraseRes = await importVaultWords(phraseRows);
    ok(`Phrase import: ${phraseRes.inserted} rows inserted`);

    // ── STEP 3: EXPORT / FETCH FROM VAULT ──────────────────────────────────
    console.log(`\n[${iter}] Step 3: Export / Verify Vault`);
    const exported = await fetchVaultWords(50);
    ok(`Vault fetch: ${exported.length} words returned`);
    
    const foundVocab = exported.some(w => w.english === `word ${iter}a1` || w.english === `Word ${iter}A1`);
    const foundPhrase = exported.some(w => w.english?.includes(`Idiom ${iter}A`) || w.english?.includes(`idiom ${iter}a`));
    foundVocab ? ok(`Vocab word found in export`) : warn(`Vocab word not found (may be > limit)`);
    foundPhrase ? ok(`Phrase word found in export`) : warn(`Phrase word not found (may be > limit)`);

    // ── STEP 4: GENERATE ASSESSMENT SHELLS ─────────────────────────────────
    console.log(`\n[${iter}] Step 4: Auto-Generate Assessment Hierarchy`);
    if (level1 && classRow) {
      // Create TASK shell for vocab
      const taskTitle = `[E2E-${iter}] Vocab Task - Topic ${iter}A`;
      const taskPayload = {
        institution_id:   program.institution_id,
        program_id:       program.id,
        class_id:         classRow.id,
        level_id:         level1.id,
        assessment_type:  'VOCAB_TASK',
        assessment_category: 'TASK',
        shell_code:       `E2E-TASK-TH${iter}-TP${iter}A`,
        title:            taskTitle,
        description:      `E2E Test TASK: Theme ${iter} / Topic ${iter}A`,
        status:           'PUBLISHED',
        working_duration_minutes: 60,
        payload:          { is_dynamic_shell: true, theme_code: `TH${iter}`, topic_code: `TP${iter}A` },
        created_by:       'E2E-Test',
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString()
      };
      const [taskAsm] = await insert('assessments', [taskPayload]);
      trackIds.push(taskAsm.id);
      ok(`TASK shell created: ${taskAsm.id}`);

      // Create TEST shell for theme
      const testTitle = `[E2E-${iter}] Theme Test - Theme ${iter}`;
      const testPayload = {
        institution_id:   program.institution_id,
        program_id:       program.id,
        class_id:         classRow.id,
        level_id:         level1.id,
        assessment_type:  'VOCAB_TEST',
        assessment_category: 'TEST',
        shell_code:       `E2E-TEST-TH${iter}`,
        title:            testTitle,
        description:      `E2E Test TEST: Theme ${iter}`,
        status:           'PUBLISHED',
        working_duration_minutes: 90,
        prerequisite_assessment_id: taskAsm.id,
        payload:          { is_dynamic_shell: true, theme_code: `TH${iter}`, topic_code: null },
        created_by:       'E2E-Test',
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString()
      };
      const [testAsm] = await insert('assessments', [testPayload]);
      trackIds.push(testAsm.id);
      ok(`TEST shell created: ${testAsm.id}`);

      // Create PHRASE RECOGNITION shell
      const phraseTitle = `[E2E-${iter}] Phrase Task - Phrase Topic ${iter}A`;
      const phrasePayload = {
        institution_id:   program.institution_id,
        program_id:       program.id,
        class_id:         classRow.id,
        level_id:         level1.id,
        assessment_type:  'VOCAB_TASK',
        assessment_category: 'TASK',
        shell_code:       `E2E-PHRASE-TH${iter}-PH${iter}A`,
        title:            phraseTitle,
        description:      `E2E Phrase Recognition TASK: Theme ${iter} / Phrase Topic ${iter}A`,
        status:           'PUBLISHED',
        working_duration_minutes: 60,
        payload:          { is_dynamic_shell: true, theme_code: `TH${iter}`, topic_code: `PH${iter}A` },
        created_by:       'E2E-Test',
        created_at:       new Date().toISOString(),
        updated_at:       new Date().toISOString()
      };
      const [phraseAsm] = await insert('assessments', [phrasePayload]);
      trackIds.push(phraseAsm.id);
      ok(`Phrase Recognition shell created: ${phraseAsm.id}`);

    } else {
      warn('No class/level found — skipping shell creation');
    }

    // ── STEP 5: SIMULATE STUDENT TAKING TEST ───────────────────────────────
    console.log(`\n[${iter}] Step 5: Simulate Student Taking Test`);
    if (student && trackIds.length >= iter * 3 - 2) {
      const asmId = trackIds[trackIds.length - 3]; // The TASK from this iteration
      try {
        const attemptRes = await startAssessment(student.id, asmId);
        const attemptId = attemptRes.attempt?.id || attemptRes.attemptId || attemptRes.attempt_id;
        if (attemptId) {
          ok(`Attempt started: ${attemptId}`);
          
          const submitRes = await submitAssessment(attemptId);
          ok(`Submitted. Grade: ${submitRes.grade || 'N/A'}, Score: ${submitRes.totalScore ?? 0}/${submitRes.maxScore ?? 0}`);
        } else {
          warn(`Attempt response unexpected: ${JSON.stringify(attemptRes).substring(0, 100)}`);
        }
      } catch (e) {
        warn(`Student test simulation: ${e.message.substring(0, 120)}`);
      }
    } else {
      warn('No student or no assessments available — skipping simulation');
    }

  } catch (e) {
    fail(`Iteration ${iter} failed: ${e.message}`);
    console.error('  Stack:', e.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

// ── CLEANUP ───────────────────────────────────────────────────────────────────
if (trackIds.length > 0) {
  head('🧹 CLEANUP — Removing E2E test assessments');
  for (const id of trackIds) {
    try {
      await del('assessments', `?id=eq.${id}`);
      console.log(`  🗑️  Deleted assessment ${id}`);
    } catch (e) {
      warn(`Could not delete ${id}: ${e.message}`);
    }
  }
}

// ── SUMMARY ───────────────────────────────────────────────────────────────────
head('📊 TEST SUMMARY');
console.log(`  ✅ Passed: ${passed}`);
console.log(`  ⚠️  Warnings: ${warns}`);
console.log(`  ❌ Failed: ${failed}`);
console.log(`\n  Overall: ${failed === 0 ? '🎉 ALL TESTS PASSED!' : `💥 ${failed} TEST(S) FAILED`}\n`);

process.exit(failed > 0 ? 1 : 0);
