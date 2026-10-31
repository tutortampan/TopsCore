import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';

// 1. Get all tests in this class
const { data: tests } = await sb.from('tests')
  .select('id, title, shell_code, display_order')
  .eq('class_id', classId)
  .order('display_order');
const testMap = new Map(tests.map(t => [t.id, t]));
const testIds = tests.map(t => t.id);

console.log(`Class has ${tests.length} tests.`);

// 2. Fetch all attempts for these tests
let allAttempts = [];
let page = 0;
const pageSize = 1000;
while (true) {
  const { data: atts, error } = await sb.from('attempts')
    .select('id, student_id, test_id, attempt_number, score, total_questions, percentage, grade, effective_score, is_remedial_unlocked, is_best_score, started_at, submitted_at, created_at, updated_at')
    .in('test_id', testIds)
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (error) {
    console.error('Error fetching attempts:', error);
    break;
  }
  if (!atts || atts.length === 0) break;
  allAttempts.push(...atts);
  if (atts.length < pageSize) break;
  page++;
}

console.log(`Total attempts fetched for class tests: ${allAttempts.length}`);

// 3. For all attempts, check if they are synthetic dummy or real
// A synthetic dummy attempt has:
// created_at or submitted_at on 2026-10-31 between 01:00 and 03:00 UTC (01:50, 02:15, 02:39)
// started_at == submitted_at (diff == 0)
// score == 60% (or effective_score == 60% of total_questions)

const syntheticDummies = [];
const potentialOverwrittenReal = [];
const genuineUnmodifiedReal = [];

// Fetch answer counts or answers for attempts created on 2026-10-31
for (const a of allAttempts) {
  const isCreatedToday = a.created_at && a.created_at.startsWith('2026-10-31');
  const isSubmittedToday = a.submitted_at && a.submitted_at.startsWith('2026-10-31');
  const diffMs = (a.started_at && a.submitted_at) ? (new Date(a.submitted_at) - new Date(a.started_at)) : 0;
  
  // Check if it matches the signature of the synthetic dummy creator:
  // created at 01:50:05, 02:15:20, 02:39:19 with diff == 0
  const isSyntheticTimestamp = ['01:50', '02:15', '02:39'].some(t => a.created_at?.includes(`T${t}:`) || a.submitted_at?.includes(`T${t}:`));
  
  if (isSyntheticTimestamp && diffMs === 0) {
    syntheticDummies.push(a);
  } else if (isSubmittedToday && (a.submitted_at?.includes('T00:23:') || a.updated_at?.includes('T10:15:'))) {
    // Was modified by the script today
    potentialOverwrittenReal.push(a);
  } else {
    genuineUnmodifiedReal.push(a);
  }
}

console.log(`Synthetic Dummies detected (diff=0, bulk batch): ${syntheticDummies.length}`);
console.log(`Potential Overwritten Real attempts: ${potentialOverwrittenReal.length}`);
console.log(`Genuine Real attempts: ${genuineUnmodifiedReal.length}`);

fs.writeFileSync('scripts/audit_all_attempts_summary.json', JSON.stringify({
  total: allAttempts.length,
  syntheticDummiesCount: syntheticDummies.length,
  potentialOverwrittenCount: potentialOverwrittenReal.length,
  genuineRealCount: genuineUnmodifiedReal.length,
  syntheticDummiesSample: syntheticDummies.slice(0, 10),
  potentialOverwrittenSample: potentialOverwrittenReal.slice(0, 10)
}, null, 2));

console.log('Saved summary to scripts/audit_all_attempts_summary.json');
