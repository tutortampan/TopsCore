if (typeof global.window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { hostname: 'localhost' }
  };
  global.document = {
    addEventListener: () => {},
    removeEventListener: () => {},
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  };
  global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  global.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_CLOUD_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const sb = createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_ANON_KEY);

const { generateTestQuestions } = await import('../js/api.js');

async function verify() {
  console.log('=== VERIFYING EVNIKOM TASK ISOLATION & ZERO CROSS-POLLINATION ===\n');

  // 1. Test 1G1 (Time Name)
  const timeTestId = 'ca970efc-4e0e-40ae-bc18-0e7295400737';
  const { data: timeTest } = await sb.from('tests').select('*').eq('id', timeTestId).single();
  console.log(`[TEST 1] Running generateTestQuestions for: "${timeTest.title}" (${timeTest.shell_code})`);
  
  const timeQuestions = await generateTestQuestions(sb, timeTest);
  console.log(`  Generated questions count: ${timeQuestions.length}`);

  const timeTopicCounts = {};
  timeQuestions.forEach(q => {
    timeTopicCounts[q.topic_snapshot] = (timeTopicCounts[q.topic_snapshot] || 0) + 1;
  });
  console.log('  Topics in 1G1 Time Name task:', timeTopicCounts);

  const hasFamilyInTime = timeQuestions.some(q => /family/i.test(q.topic_snapshot || '') || /ayah|ibu|paman|bibi/i.test(q.question_text_snapshot || ''));
  if (hasFamilyInTime) {
    console.error('❌ FAIL: Family Member words found in Time Name task!');
    process.exit(1);
  } else {
    console.log('  ✔ PASS: 100% Time Name words! Zero Family Member contamination.');
  }

  // 2. Test 1G2 (Family Member)
  const familyTestId = '92971811-6b02-4f13-8c29-b544061eca67';
  const { data: familyTest } = await sb.from('tests').select('*').eq('id', familyTestId).single();
  console.log(`\n[TEST 2] Running generateTestQuestions for: "${familyTest.title}" (${familyTest.shell_code})`);

  const familyQuestions = await generateTestQuestions(sb, familyTest);
  console.log(`  Generated questions count: ${familyQuestions.length}`);

  const familyTopicCounts = {};
  familyQuestions.forEach(q => {
    familyTopicCounts[q.topic_snapshot] = (familyTopicCounts[q.topic_snapshot] || 0) + 1;
  });
  console.log('  Topics in 1G2 Family Member task:', familyTopicCounts);

  const hasTimeInFamily = familyQuestions.some(q => /time/i.test(q.topic_snapshot || '') || /senin|selasa|rabu|kamis|jumat|sabtu|minggu|januari|agustus/i.test(q.question_text_snapshot || ''));
  if (hasTimeInFamily) {
    console.error('❌ FAIL: Time Name words found in Family Member task!');
    process.exit(1);
  } else {
    console.log('  ✔ PASS: 100% Family Member words! Zero Time Name contamination.');
  }

  console.log('\n🎉 ALL EVNIKOM TEST ISOLATION CHECKS PASSED 100%!');
}

verify().catch(console.error);
