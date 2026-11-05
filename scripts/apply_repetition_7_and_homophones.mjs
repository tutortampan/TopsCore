import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env
const envText = fs.readFileSync('.env', 'utf8');
const env = {};
envText.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = (match[2] || '').trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
const sb = createClient(url, key);

async function main() {
  console.log('=== HARMONIZING 7x7 REPETITIVE MASTERY SETTINGS (SERVICE ROLE) ===');

  // 1. Upsert site_settings
  const settingsRows = [
    {
      key: 'default_test_system_settings',
      value: JSON.stringify({ taskRepetitions: 7, taskMinScore: 50, examMinScore: 60 }),
      updated_at: new Date().toISOString()
    },
    {
      key: 'class_test_settings_2ccf6468-1e03-41d1-b72b-1d84dcad85b2',
      value: JSON.stringify({ taskRepetitions: 7, taskMinScore: 50, examMinScore: 60 }),
      updated_at: new Date().toISOString()
    },
    {
      key: 'class_test_settings_ab33498a-90e6-44b7-83f4-5765f964543e',
      value: JSON.stringify({ taskRepetitions: 7, taskMinScore: 50, examMinScore: 60 }),
      updated_at: new Date().toISOString()
    }
  ];

  for (const row of settingsRows) {
    const { data: existing } = await sb.from('site_settings').select('key').eq('key', row.key).maybeSingle();
    if (existing) {
      const { error } = await sb.from('site_settings').update({ value: row.value, updated_at: row.updated_at }).eq('key', row.key);
      if (error) console.error(`Error updating ${row.key}:`, error);
      else console.log(`Updated site_settings [${row.key}]:`, row.value);
    } else {
      const { error } = await sb.from('site_settings').insert(row);
      if (error) console.error(`Error inserting ${row.key}:`, error);
      else console.log(`Inserted site_settings [${row.key}]:`, row.value);
    }
  }

  // 2. Ensure all tests in DB have payload.task_repetitions = 7
  const { data: tests, error: testErr } = await sb.from('tests')
    .select('id, title, payload')
    .is('deleted_at', null);

  if (testErr) throw testErr;
  console.log(`Checking ${tests?.length || 0} tests for task_repetitions...`);

  let updatedCount = 0;
  for (const t of (tests || [])) {
    const p = t.payload || {};
    if (p.task_repetitions !== 7) {
      p.task_repetitions = 7;
      const { error } = await sb.from('tests').update({ payload: p }).eq('id', t.id);
      if (error) console.error(`Failed to update test ${t.id}:`, error);
      else updatedCount++;
    }
  }
  console.log(`Updated ${updatedCount} tests with task_repetitions = 7.`);
  console.log('Harmonization completed successfully!');
}

main().catch(console.error);
