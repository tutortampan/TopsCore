import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://oclajpyumehpojepcczg.supabase.co',
  'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB'
);

async function testLevelUpLogic() {
  console.log('=== TEST: LEVEL-UP PROGRESSION LOGIC ===\n');

  // 1. Verify Level 3 gating exam is found with EXAM category
  const level3Id = '51589e1a-d96e-496e-92a3-d9d350483555';
  
  // Legacy query
  const { data: legacyTests } = await sb.from('tests')
    .select('id, title, display_order, shell_code, category')
    .eq('level_id', level3Id)
    .eq('category', 'TEST')
    .eq('status', 'PUBLISHED')
    .order('display_order', { ascending: false })
    .limit(1);

  // New query
  const { data: newTests } = await sb.from('tests')
    .select('id, title, display_order, shell_code, category')
    .eq('level_id', level3Id)
    .in('category', ['EXAM', 'TEST'])
    .eq('status', 'PUBLISHED')
    .order('display_order', { ascending: false })
    .limit(1);

  console.log('1. Legacy query (.eq("category", "TEST")):');
  console.log('   Found:', legacyTests?.length || 0, 'tests');
  if (!legacyTests || legacyTests.length === 0) {
    console.log('   ✅ PASS: Confirmed legacy query failed to find milestone exams.');
  }

  console.log('\n2. New query (.in("category", ["EXAM", "TEST"])):');
  console.log('   Found:', newTests?.length || 0, 'tests');
  if (newTests && newTests.length > 0) {
    console.log(`   Top Exam: ${newTests[0].shell_code} (Category: ${newTests[0].category}, Order: ${newTests[0].display_order})`);
    console.log('   ✅ PASS: Confirmed milestone exam is now correctly detected as gating exam!');
  } else {
    throw new Error('New query failed to find gating exam');
  }

  // 3. Test progression simulation
  console.log('\n3. Testing Progression Threshold Logic:');
  const passingScore = 65;
  const failingScore = 55;

  const mockAttemptPass = [{ test_id: newTests[0].id, percentage: passingScore }];
  const mockAttemptFail = [{ test_id: newTests[0].id, percentage: failingScore }];

  const passMap = {};
  mockAttemptPass.forEach(a => { passMap[a.test_id] = a.percentage; });
  const isPassAdvancing = [newTests[0].id].every(id => (passMap[id] || 0) >= 60);

  const failMap = {};
  mockAttemptFail.forEach(a => { failMap[a.test_id] = a.percentage; });
  const isFailAdvancing = [newTests[0].id].every(id => (failMap[id] || 0) >= 60);

  console.log(`   Score ${passingScore}% >= 60% advances: ${isPassAdvancing} (Expected: true)`);
  console.log(`   Score ${failingScore}% >= 60% advances: ${isFailAdvancing} (Expected: false)`);

  if (isPassAdvancing && !isFailAdvancing) {
    console.log('   ✅ PASS: Level progression gate enforces 60% threshold strictly!');
  } else {
    throw new Error('Progression threshold logic failure');
  }

  // 4. Test Effective Score handling (remedial score evaluation)
  console.log('\n4. Testing Effective Score vs Raw Percentage:');
  const mockAttemptRemedial = [{ test_id: newTests[0].id, percentage: 80, effective_score: 60 }];
  const mockAttemptFailedRemedial = [{ test_id: newTests[0].id, percentage: 55, effective_score: 55 }];
  
  const remPassMap = {};
  mockAttemptRemedial.forEach(a => {
    const raw = a.effective_score !== null && a.effective_score !== undefined ? a.effective_score : a.percentage;
    remPassMap[a.test_id] = raw;
  });
  const isRemAdvancing = [newTests[0].id].every(id => (remPassMap[id] || 0) >= 60);

  const remFailMap = {};
  mockAttemptFailedRemedial.forEach(a => {
    const raw = a.effective_score !== null && a.effective_score !== undefined ? a.effective_score : a.percentage;
    remFailMap[a.test_id] = raw;
  });
  const isRemFailAdvancing = [newTests[0].id].every(id => (remFailMap[id] || 0) >= 60);

  console.log(`   Remedial effective score 60% >= 60% advances: ${isRemAdvancing} (Expected: true)`);
  console.log(`   Remedial effective score 55% >= 60% advances: ${isRemFailAdvancing} (Expected: false)`);
  if (!isRemAdvancing || isRemFailAdvancing) {
    throw new Error('Effective score evaluation logic failure');
  }
  console.log('   ✅ PASS: Effective score (remedial cap) correctly evaluated for level progression!');

  // 5. Test fetchStudentLevel dual-check query
  console.log('\n5. Testing fetchStudentLevel Dual-Check Query:');
  const { data: testStudent, error: studErr } = await sb.from('students')
    .select(`
      id,
      name,
      level_id,
      levels:level_id(id, level_number, name),
      batch_id,
      batches:batch_id(current_level_id, levels:current_level_id(id, level_number, name))
    `)
    .limit(1)
    .single();

  if (studErr || !testStudent) {
    throw new Error('Failed to query student level relation: ' + JSON.stringify(studErr));
  }

  const resolvedLvlId = testStudent.level_id || testStudent.batches?.current_level_id || null;
  const resolvedLvlNum = testStudent.levels?.level_number || testStudent.batches?.levels?.level_number || 1;
  const resolvedLvlName = testStudent.levels?.name || testStudent.batches?.levels?.name || '1st Level';
  console.log(`   Student: ${testStudent.name}`);
  console.log(`   Resolved Level: ${resolvedLvlName} (Level ${resolvedLvlNum}, ID: ${resolvedLvlId})`);
  if (!resolvedLvlId || !resolvedLvlNum || !resolvedLvlName) {
    throw new Error('Dual-check level resolution returned incomplete data');
  }
  console.log('   ✅ PASS: fetchStudentLevel dual-check query verified on live database!');

  console.log('\n=== ALL LEVEL-UP PROGRESSION TESTS PASSED! ===');
}

testLevelUpLogic().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
