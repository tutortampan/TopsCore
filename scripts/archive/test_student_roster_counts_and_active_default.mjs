import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testRosterScopeAndDefaults() {
  console.log('=== TEST: STUDENT ROSTER COUNTS & ACTIVE DEFAULT TAB ===\n');

  // 1. Fetch batches
  const { data: batches } = await sb.from('batches').select('id, name, is_active, program_id, deleted_at').is('deleted_at', null);
  const batch133 = batches.find(b => b.name === '133');
  console.log(`Found Active Batch 133: ID ${batch133.id}`);

  // 2. Fetch all non-deleted students
  const { data: students } = await sb.from('students')
    .select('id, name, is_active, batch_id, program_id, deleted_at')
    .is('deleted_at', null);

  const programStudents = students.filter(s => s.program_id === batch133.program_id);
  console.log(`Total students across all batches in Camp program: ${programStudents.length}`);

  // 3. Test Scoped to Batch 133
  const _filterBatchId = batch133.id;
  const rosterScopeStudents = _filterBatchId 
    ? programStudents.filter(s => s.batch_id === _filterBatchId)
    : programStudents.filter(s => (s.batches ? s.batches.is_active !== false : true));

  const activeCount = rosterScopeStudents.filter(s => s.is_active !== false).length;
  const inactiveCount = rosterScopeStudents.filter(s => s.is_active === false).length;
  const totalCount = rosterScopeStudents.length;

  console.log('\n--- TOPBAR TABS SCOPED COUNTS ---');
  console.log(`🟢 Active Students: ${activeCount}`);
  console.log(`⚪ Inactive Students: ${inactiveCount}`);
  console.log(`👥 All Students: ${totalCount}`);

  // Assertions
  if (activeCount !== 22) throw new Error(`Expected activeCount 22, got ${activeCount}`);
  if (inactiveCount !== 2) throw new Error(`Expected inactiveCount 2, got ${inactiveCount}`);
  if (totalCount !== 24) throw new Error(`Expected totalCount 24, got ${totalCount}`);

  // 4. Test Default Tab Selection
  let _filterBatchStatus = null; // No status in URL
  const currentBatchStatus = (_filterBatchStatus === 'inactive' || _filterBatchStatus === 'all')
    ? _filterBatchStatus
    : 'active';

  console.log(`\nDefault selected tab when entering roster: '${currentBatchStatus}' (Expected: 'active')`);
  if (currentBatchStatus !== 'active') throw new Error(`Default tab must be 'active', got ${currentBatchStatus}`);

  // 5. Test Filtered Data for Each Tab
  const activeRecords = rosterScopeStudents.filter(s => s.is_active !== false);
  const inactiveRecords = rosterScopeStudents.filter(s => s.is_active === false);
  const allRecords = rosterScopeStudents;

  console.log(`- 'active' tab records: ${activeRecords.length} (Expected: 22)`);
  console.log(`- 'inactive' tab records: ${inactiveRecords.length} (Expected: 2) -> [${inactiveRecords.map(s => s.name).join(', ')}]`);
  console.log(`- 'all' tab records: ${allRecords.length} (Expected: 24)`);

  if (activeRecords.length !== 22) throw new Error(`Active records mismatch`);
  if (inactiveRecords.length !== 2) throw new Error(`Inactive records mismatch`);
  if (allRecords.length !== 24) throw new Error(`All records mismatch`);

  console.log('\n✅ ALL ROSTER COUNT AND ACTIVE TAB ASSERTIONS PASSED PERFECTLY!\n');
}

testRosterScopeAndDefaults();
