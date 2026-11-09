import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deepAudit() {
  console.log('=== DEEP SUPABASE DATABASE INTEGRITY AUDIT ===\n');

  // 1. Audit Tests
  const { data: tests, error: errTests } = await sb.from('tests').select('id, title, class_id, level_id, display_order');
  console.log(`[1] Tests: ${tests ? tests.length : 0} records (Error: ${errTests?.message || 'None'})`);
  const missingClass = (tests || []).filter(t => !t.class_id);
  if (missingClass.length > 0) console.warn(`⚠️ Tests without class_id: ${missingClass.length}`);
  else console.log('✅ All tests have valid class_id.');

  // 2. Audit Students
  const { data: students, error: errStudents } = await sb.from('students').select('id, name, batch_id, program_id, is_active').is('deleted_at', null);
  console.log(`\n[2] Active Students: ${students ? students.length : 0} records (Error: ${errStudents?.message || 'None'})`);
  const missingBatch = (students || []).filter(s => !s.batch_id);
  if (missingBatch.length > 0) console.warn(`⚠️ Students without batch_id: ${missingBatch.length}`);
  else console.log('✅ All active students have valid batch_id.');

  // 3. Audit Attempts for best_score uniqueness
  console.log('\n[3] Checking attempts is_best_score uniqueness...');
  let allBestAttempts = [];
  let page = 0;
  while (true) {
    const { data: atts, error } = await sb.from('attempts')
      .select('id, student_id, test_id, is_best_score, score, percentage, grade, status')
      .eq('is_best_score', true)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!atts || atts.length === 0) break;
    allBestAttempts = allBestAttempts.concat(atts);
    page++;
  }
  console.log(`Total is_best_score = true attempts: ${allBestAttempts.length}`);

  const pairMap = new Map();
  let duplicateBestScoreCount = 0;
  allBestAttempts.forEach(att => {
    const key = `${att.student_id}::${att.test_id}`;
    if (pairMap.has(key)) {
      duplicateBestScoreCount++;
      console.warn(`⚠️ Duplicate is_best_score = true for pair ${key}: IDs [${pairMap.get(key).id}, ${att.id}]`);
    } else {
      pairMap.set(key, att);
    }
  });

  if (duplicateBestScoreCount === 0) {
    console.log('✅ Perfect is_best_score uniqueness! 0 duplicates found.');
  } else {
    console.error(`❌ Found ${duplicateBestScoreCount} duplicate is_best_score entries!`);
  }

  // 4. Audit Programs & Batches
  const { data: progs } = await sb.from('programs').select('id, name, is_active');
  const { data: batches } = await sb.from('batches').select('id, name, program_id, is_active, deleted_at').is('deleted_at', null);
  console.log(`\n[4] Programs: ${progs?.length || 0}, Non-deleted Batches: ${batches?.length || 0}`);
  const orphanBatches = (batches || []).filter(b => !progs?.some(p => p.id === b.program_id));
  if (orphanBatches.length > 0) console.warn(`⚠️ Batches with invalid program_id: ${orphanBatches.length}`);
  else console.log('✅ All non-deleted batches link to valid programs.');

  console.log('\n=== AUDIT COMPLETE ===');
}

deepAudit();

