import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const times = [
  '2026-10-31T01:50:05.444+00:00',
  '2026-10-31T02:15:20.654+00:00',
  '2026-10-31T02:39:19.389+00:00'
];

console.log('1. Fetching all synthetic dummy attempt IDs...');
let allDummyIds = [];
for (const t of times) {
  const { data: atts, error } = await sb.from('attempts')
    .select('id, student_id, test_id')
    .eq('created_at', t);
  if (atts) allDummyIds.push(...atts);
}

console.log(`Found ${allDummyIds.length} synthetic dummy attempts to delete.`);

// Delete in batches of 50
let deletedCount = 0;
for (let i = 0; i < allDummyIds.length; i += 50) {
  const slice = allDummyIds.slice(i, i + 50).map(a => a.id);
  const { error } = await sb.from('attempts').delete().in('id', slice);
  if (error) {
    console.error(`Error deleting batch ${i}:`, error);
  } else {
    deletedCount += slice.length;
    process.stdout.write(`Deleted ${deletedCount}/${allDummyIds.length}\r`);
  }
}
console.log(`\nSuccessfully deleted ${deletedCount} synthetic dummy attempts!`);

console.log('2. Re-evaluating is_best_score for all affected (student_id, test_id) pairs...');
const affectedPairs = new Set(allDummyIds.map(a => `${a.student_id}|${a.test_id}`));
console.log(`Unique affected student-test pairs: ${affectedPairs.size}`);

let pairIndex = 0;
let restoredBestCount = 0;
for (const pair of affectedPairs) {
  const [sId, tId] = pair.split('|');
  const { data: remaining } = await sb.from('attempts')
    .select('id, score, submitted_at, is_best_score')
    .eq('student_id', sId)
    .eq('test_id', tId)
    .order('score', { ascending: false })
    .order('submitted_at', { ascending: false });

  if (remaining && remaining.length > 0) {
    const bestAttempt = remaining[0];
    if (!bestAttempt.is_best_score) {
      await sb.from('attempts').update({ is_best_score: true }).eq('id', bestAttempt.id);
      restoredBestCount++;
    }
    // Demote any other attempts
    for (let j = 1; j < remaining.length; j++) {
      if (remaining[j].is_best_score) {
        await sb.from('attempts').update({ is_best_score: false }).eq('id', remaining[j].id);
      }
    }
  }
  pairIndex++;
  if (pairIndex % 25 === 0 || pairIndex === affectedPairs.size) {
    process.stdout.write(`Processed ${pairIndex}/${affectedPairs.size} pairs (restored ${restoredBestCount} best scores)\r`);
  }
}
console.log(`\nRe-evaluation of is_best_score completed. Restored ${restoredBestCount} best scores.`);

console.log('3. Cleaning forgiven_student_ids on Test 39 payload...');
const { data: t39 } = await sb.from('tests')
  .select('id, payload')
  .eq('class_id', 'ab33498a-90e6-44b7-83f4-5765f964543e')
  .eq('display_order', 39)
  .single();

if (t39) {
  const newPayload = { ...t39.payload, forgiven_student_ids: [] };
  const { error } = await sb.from('tests').update({ payload: newPayload }).eq('id', t39.id);
  if (error) {
    console.error('Error updating Test 39 payload:', error);
  } else {
    console.log('Test 39 payload updated: forgiven_student_ids set to [].');
  }
}

console.log('Execution completed successfully!');

