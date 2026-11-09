import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';

// Fetch all attempts for tests in this class
const { data: tests } = await sb.from('tests').select('id').eq('class_id', classId);
const testIds = tests.map(t => t.id);

let allAttempts = [];
let page = 0;
const pageSize = 1000;
while (true) {
  const { data: atts, error } = await sb.from('attempts')
    .select('*')
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

console.log(`Fetched ${allAttempts.length} total attempts for backup.`);

const backupData = {
  timestamp: new Date().toISOString(),
  classId,
  totalAttempts: allAttempts.length,
  attempts: allAttempts
};

fs.writeFileSync('scripts/full_attempts_backup_before_purge.json', JSON.stringify(backupData, null, 2));
console.log('Saved full backup to scripts/full_attempts_backup_before_purge.json');

