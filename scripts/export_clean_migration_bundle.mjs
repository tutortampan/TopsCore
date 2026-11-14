// TopsCore LMS — Clean Migration Bundle Exporter
// Exports only authoritative production data: Master catalogs + 845 Best Score Attempts + Clean Audit Logs
// Discards: 145,226 attempt_answers, non-best attempts, and CHEAT_ATTEMPT spam logs.

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const OUTPUT_DIR = path.resolve('supabase/clean_migration_bundle');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchAll(table, filterFn = null) {
  let allRows = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = client.from(table).select('*').range(from, from + pageSize - 1);
    if (filterFn) {
      query = filterFn(query);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch from ${table}: ${error.message}`);
    }
    if (data && data.length > 0) {
      allRows.push(...data);
      from += pageSize;
      if (data.length < pageSize) {
        hasMore = false;
      }
    } else {
      hasMore = false;
    }
  }
  return allRows;
}

async function run() {
  console.log('====================================================');
  console.log(' TOPSCORE LMS — EXPORTING CLEAN MIGRATION BUNDLE');
  console.log('====================================================\n');

  const manifest = {
    exported_at: new Date().toISOString(),
    source_url: SUPABASE_URL,
    tables: {},
    discarded_stats: {
      attempt_answers_omitted: 145226,
      non_best_attempts_omitted: 1494,
      cheat_logs_omitted: 931
    }
  };

  // 1. Master Catalogs
  const tablesToExport = [
    { name: 'institutions', filter: null },
    { name: 'programs', filter: null },
    { name: 'levels', filter: null },
    { name: 'batches', filter: null },
    { name: 'classes', filter: null },
    { name: 'class_levels', filter: null },
    { name: 'students', filter: null },
    { name: 'tests', filter: null },
    { name: 'vocabulary_vault', filter: null },
    { name: 'site_settings', filter: null },
    { name: 'theme_program_assignments', filter: null },
    // 2. Attempts: ONLY best score attempts!
    {
      name: 'attempts',
      filter: (q) => q.eq('is_best_score', true)
    },
    // 3. Audit Logs: Exclude CHEAT_ATTEMPT spam
    {
      name: 'audit_logs',
      filter: (q) => q.neq('action', 'CHEAT_ATTEMPT')
    }
  ];

  for (const item of tablesToExport) {
    process.stdout.write(`Fetching ${item.name}... `);
    const rows = await fetchAll(item.name, item.filter);
    const filePath = path.join(OUTPUT_DIR, `${item.name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), 'utf8');
    const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);
    manifest.tables[item.name] = { count: rows.length, size_kb: Number(sizeKb) };
    console.log(`[OK] ${rows.length} rows (${sizeKb} KB)`);
  }

  // 4. Download Storage Avatars
  const avatarDir = path.join(OUTPUT_DIR, 'storage_student_avatars');
  if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });
  const { data: avatarList } = await client.storage.from('student-avatars').list();
  if (avatarList && avatarList.length > 0) {
    console.log(`\nDownloading ${avatarList.length} avatar files...`);
    for (const f of avatarList) {
      const { data: blob, error } = await client.storage.from('student-avatars').download(f.name);
      if (!error && blob) {
        const buffer = Buffer.from(await blob.arrayBuffer());
        fs.writeFileSync(path.join(avatarDir, f.name), buffer);
        console.log(` - Saved avatar: ${f.name} (${buffer.length} bytes)`);
      }
    }
  }

  // Save manifest
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n====================================================');
  console.log(' CLEAN MIGRATION BUNDLE EXPORT COMPLETE!');
  console.log(' Output directory:', OUTPUT_DIR);
  console.log(' Manifest summary:');
  console.table(manifest.tables);
  console.log(' Discarded unneeded data:');
  console.table(manifest.discarded_stats);
  console.log('====================================================\n');
}

run().catch(err => {
  console.error('\n[FATAL ERROR]', err);
  process.exit(1);
});
