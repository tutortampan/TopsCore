import { getSupabase } from '../js/supabase.js';

global.window = {
  location: { hostname: 'cloud' },
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};

async function run() {
  const fs = await import('fs');
  const envContent = fs.readFileSync('.env', 'utf8');
  let dbUrl = '';
  envContent.split('\n').forEach(line => {
    if (line.startsWith('DATABASE_URL=')) {
      dbUrl = line.substring('DATABASE_URL='.length).trim();
      if (dbUrl.startsWith('"') && dbUrl.endsWith('"')) dbUrl = dbUrl.slice(1, -1);
    }
  });

  if (!dbUrl) {
    console.log('No DATABASE_URL found');
    return;
  }

  const { default: pg } = await import('pg');
  const client = new pg.Client({
    host: 'db.lgzkbmsyqhvdjirbyzsg.supabase.co',
    port: 5432,
    user: 'postgres',
    password: '100%Topscore',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  const res = await client.query(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);

  console.log('Total Indexes in public schema:', res.rows.length);
  const byTable = {};
  res.rows.forEach(r => {
    if (!byTable[r.tablename]) byTable[r.tablename] = [];
    byTable[r.tablename].push(r.indexname);
  });
  for (const [table, idxs] of Object.entries(byTable)) {
    console.log(`- ${table}: ${idxs.join(', ')}`);
  }

  // Check foreign keys without indexes
  const fkCheck = await client.query(`
    SELECT
      c.conrelid::regclass AS table_name,
      pg_get_constraintdef(c.oid) AS fk_def
    FROM pg_constraint c
    WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
    ORDER BY table_name;
  `);

  console.log('\nForeign Keys Count:', fkCheck.rows.length);

  await client.end();
}

run().catch(console.error);
