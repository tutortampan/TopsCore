// run_migration.mjs — Runs a SQL migration against Supabase via the management API
// Usage: node run_migration.mjs <sql_file>

const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

// Extract project ref from URL: https://<ref>.supabase.co
const PROJECT_REF = SUPABASE_URL.replace('https://', '').split('.')[0];

import fs from 'fs';
import path from 'path';

const sqlFile = process.argv[2];
if (!sqlFile) {
  console.error('Usage: node run_migration.mjs <sql_file>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(sqlFile), 'utf8');
console.log(`Running migration: ${sqlFile}`);
console.log(`SQL length: ${sql.length} chars`);

// Split by semicolons and run each statement
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} statements to execute\n`);

let passed = 0;
let failed = 0;

for (const stmt of statements) {
  // Use the Supabase REST RPC to run SQL via the rpc endpoint
  // We'll use the pg_catalog query approach via PostgREST
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: stmt + ';' })
  });
  
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    // If the RPC doesn't exist, try direct query via Supabase SQL editor endpoint
    console.warn(`  ⚠️  stmt failed (${res.status}): ${err?.message || err?.hint || JSON.stringify(err)}`);
    console.warn(`  Statement: ${stmt.substring(0, 80)}...`);
    failed++;
  } else {
    const data = await res.json().catch(() => null);
    console.log(`  ✅ OK: ${stmt.substring(0, 60).replace(/\n/g, ' ')}...`);
    passed++;
  }
}

console.log(`\nDone: ${passed} passed, ${failed} failed`);
