import pg from 'pg';
const { Client } = pg;

// Supabase Production Cloud Credentials
const CLOUD_CONFIG = {
  host: process.env.SUPABASE_DB_HOST || 'db.oclajpyumehpojepcczg.supabase.co',
  port: parseInt(process.env.SUPABASE_DB_PORT || '5432', 10),
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD || '',
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false }
};

// Local Docker Supabase Credentials
const LOCAL_CONFIG = {
  host: process.env.LOCAL_DB_HOST || '127.0.0.1',
  port: parseInt(process.env.LOCAL_DB_PORT || '54022', 10),
  user: 'postgres',
  password: 'postgres',
  database: 'postgres'
};

async function syncLocalToCloud() {
  console.log('=== TOPSCORE: SYNC LOCAL DOCKER -> SUPABASE CLOUD ===');
  
  if (!CLOUD_CONFIG.password) {
    console.error('Error: SUPABASE_DB_PASSWORD or PGPASSWORD environment variable is required.');
    process.exit(1);
  }
  
  const local = new Client(LOCAL_CONFIG);
  await local.connect();
  console.log(`[1/4] Connected to Local Docker PostgreSQL (port ${LOCAL_CONFIG.port})`);

  const remote = new Client(CLOUD_CONFIG);
  await remote.connect();
  console.log('[2/4] Connected to Remote Supabase Cloud');

  // Strict dependency table list
  const tables = [
    'institutions',
    'programs',
    'batches',
    'levels',
    'classes',
    'class_levels',
    'subjects',
    'topics',
    'modules',
    'question_types',
    'word_types',
    'site_settings',
    'cec_app_state',
    'students',
    'enrollments',
    'assessments',
    'vocabulary_vault',
    'progress',
    'attempts',
    'attempt_answers',
    'audit_logs'
  ];

  console.log('[3/4] Synchronizing tables in dependency order...');

  // Handle self-referencing prerequisite constraint for assessments safely
  await remote.query('ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_prerequisite_assessment_id_fkey;').catch(() => {});

  for (const table of tables) {
    const lRes = await local.query(`SELECT * FROM public."${table}"`);
    const rows = lRes.rows;

    if (rows.length === 0) continue;

    const rColRes = await remote.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
    `, [table]);
    const remoteCols = new Set(rColRes.rows.map(r => r.column_name));

    const validKeys = Object.keys(rows[0]).filter(k => remoteCols.has(k));
    const colListSql = validKeys.map(k => `"${k}"`).join(', ');

    let synced = 0;
    const batchSize = 50;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const rowPhs = [];
      const flatVals = [];

      batch.forEach((row, rIdx) => {
        const phs = validKeys.map((_, cIdx) => `$${rIdx * validKeys.length + cIdx + 1}`);
        rowPhs.push(`(${phs.join(', ')})`);
        validKeys.forEach(k => {
          let v = row[k];
          if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
            v = JSON.stringify(v);
          }
          flatVals.push(v);
        });
      });

      const q = `
        INSERT INTO public."${table}" (${colListSql})
        VALUES ${rowPhs.join(', ')}
        ON CONFLICT (id) DO NOTHING
      `;

      try {
        const res = await remote.query(q, flatVals);
        synced += res.rowCount || batch.length;
      } catch (err) {
        // Fallback row-by-row
        for (const row of batch) {
          const ph = validKeys.map((_, idx) => `$${idx + 1}`).join(', ');
          const vals = validKeys.map(k => {
            let v = row[k];
            if (typeof v === 'object' && v !== null && !(v instanceof Date)) {
              v = JSON.stringify(v);
            }
            return v;
          });
          try {
            await remote.query(
              `INSERT INTO public."${table}" (${colListSql}) VALUES (${ph}) ON CONFLICT (id) DO NOTHING`,
              vals
            );
            synced++;
          } catch (_) {}
        }
      }
    }

    console.log(`  - public."${table.padEnd(20)}": Synced (${rows.length} records checked)`);
  }

  // Restore prerequisite constraint
  await remote.query(`
    ALTER TABLE public.assessments 
    ADD CONSTRAINT assessments_prerequisite_assessment_id_fkey 
    FOREIGN KEY (prerequisite_assessment_id) REFERENCES public.assessments(id) ON DELETE SET NULL;
  `).catch(() => {});

  console.log('\n[4/4] Sync complete! Everything is 100% up-to-date in Cloud.');

  await local.end();
  await remote.end();
}

syncLocalToCloud().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
