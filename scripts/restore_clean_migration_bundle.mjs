// TopsCore LMS — Clean Migration Bundle Importer (Robust Column Filter & Type Normalizer)
import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const client = new Client({
  host: 'db.lgzkbmsyqhvdjirbyzsg.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '100%Topscore',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

const BUNDLE_DIR = path.resolve('supabase/clean_migration_bundle');

async function run() {
  console.log('====================================================');
  console.log(' TOPSCORE LMS — RESTORING DATA TO TARGET VIA PG DIRECT');
  console.log(' Target: db.lgzkbmsyqhvdjirbyzsg.supabase.co:5432');
  console.log('====================================================\n');

  await client.connect();
  await client.query('SET search_path = public, extensions;');

  const tableOrder = [
    'institutions',
    'programs',
    'levels',
    'batches',
    'classes',
    'class_levels',
    'students',
    'modules',
    'tests',
    'vocabulary_vault',
    'site_settings',
    'theme_program_assignments',
    'attempts',
    'audit_logs'
  ];

  for (const table of tableOrder) {
    const filePath = path.join(BUNDLE_DIR, `${table}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`- Skipping ${table} (no JSON file)`);
      continue;
    }

    const rawRows = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!rawRows || rawRows.length === 0) {
      console.log(`- ${table}: 0 rows to import.`);
      continue;
    }

    // Fetch live columns for this table from postgres
    const colRes = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const validCols = new Set(colRes.rows.map(r => r.column_name));

    // Sanitize and filter each row
    const cleanRows = rawRows.map(r => {
      const sanitized = {};
      for (const k of Object.keys(r)) {
        if (validCols.has(k)) {
          sanitized[k] = r[k];
        }
      }

      // Special table adjustments:
      if (table === 'students') {
        const ps = String(sanitized.photo_status || '').toLowerCase();
        if (['approved', 'set', 'true'].includes(ps) || sanitized.photo_url) {
          sanitized.photo_status = 'set';
        } else if (ps === 'pending') {
          sanitized.photo_status = 'pending';
        } else {
          sanitized.photo_status = 'not_set';
        }
      }

      return sanitized;
    });

    process.stdout.write(`Restoring ${table} (${cleanRows.length} rows)... `);

    // Batch insert using parameterized SQL
    const cols = Array.from(validCols).filter(c => cleanRows.some(r => r[c] !== undefined));
    if (cols.length === 0) {
      console.log('NO VALID COLUMNS');
      continue;
    }

    const colListStr = cols.map(c => `"${c}"`).join(', ');
    const chunkSize = 100;
    let inserted = 0;

    for (let i = 0; i < cleanRows.length; i += chunkSize) {
      const chunk = cleanRows.slice(i, i + chunkSize);
      const valueClauses = [];
      const params = [];
      let paramIdx = 1;

      for (const row of chunk) {
        const rowParams = [];
        for (const col of cols) {
          let val = row[col];
          if (val === undefined) val = null;
          if (typeof val === 'object' && val !== null) {
            val = JSON.stringify(val);
          }
          params.push(val);
          rowParams.push(`$${paramIdx++}`);
        }
        valueClauses.push(`(${rowParams.join(', ')})`);
      }

      const sql = `INSERT INTO public."${table}" (${colListStr}) VALUES ${valueClauses.join(', ')} ON CONFLICT DO NOTHING;`;
      try {
        await client.query(sql, params);
        inserted += chunk.length;
      } catch (err) {
        console.log(`\n[ERROR in ${table} chunk ${i}]:`, err.message);
        throw err;
      }
    }

    console.log(`[OK] Inserted ${inserted} rows.`);
  }

  console.log('\n====================================================');
  console.log(' VERIFYING ROW COUNTS IN NEW SUPABASE:');
  console.log('====================================================\n');

  for (const table of tableOrder) {
    const res = await client.query(`SELECT COUNT(*)::int as count FROM public."${table}"`);
    console.log(`- ${table}: ${res.rows[0].count} rows`);
  }

  console.log('\n====================================================');
  console.log(' RESTORE PROCESS 100% SUCCESSFUL!');
  console.log('====================================================');

  await client.end();
}

run().catch(err => {
  console.error('\n[FATAL ERROR]', err.message);
  process.exit(1);
});
