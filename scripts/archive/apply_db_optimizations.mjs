// TopsCore LMS — Database Performance & Indexing Optimization
import pg from 'pg';

const client = new pg.Client({
  host: 'db.lgzkbmsyqhvdjirbyzsg.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '100%Topscore',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to PostgreSQL successfully.');

  // 1. Create strategic performance indexes
  console.log('\n--- 1. Creating Strategic Performance Indexes ---');
  const indexQueries = [
    'CREATE INDEX IF NOT EXISTS idx_attempts_best_score ON attempts(student_id, is_best_score);',
    'CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);',
    'CREATE INDEX IF NOT EXISTS idx_batches_program_id ON batches(program_id);',
    'CREATE INDEX IF NOT EXISTS idx_batches_current_level_id ON batches(current_level_id);',
    'CREATE INDEX IF NOT EXISTS idx_classes_program_id ON classes(program_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);'
  ];

  for (const q of indexQueries) {
    await client.query(q);
    console.log('Executed:', q.trim());
  }

  // 2. Audit logs 7-day retention
  console.log('\n--- 2. Purging Audit Logs Older Than 7 Days ---');
  const purgeRes = await client.query(`
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '7 days'
    RETURNING id;
  `);
  console.log(`Purged ${purgeRes.rowCount} audit logs older than 7 days.`);

  // Create authoritative RPC for 7-day purge
  await client.query(`
    CREATE OR REPLACE FUNCTION purge_old_audit_logs()
    RETURNS integer
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    DECLARE
      deleted_rows integer;
    BEGIN
      DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '7 days';
      GET DIAGNOSTICS deleted_rows = ROW_COUNT;
      RETURN deleted_rows;
    END;
    $$;
  `);
  console.log('Created RPC: purge_old_audit_logs() (7-day retention policy)');

  // 3. Inspect & Optimize Supabase Realtime Publication
  console.log('\n--- 3. Checking Supabase Realtime Publication ---');
  const pubRes = await client.query(`
    SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
  `);
  console.log('Tables currently in supabase_realtime:', pubRes.rows.map(r => r.tablename));

  // If heavy static tables exist in publication, drop them
  const heavyTables = ['vocabulary_vault', 'tests', 'classes', 'institutions', 'programs', 'levels', 'modules'];
  for (const tbl of pubRes.rows.map(r => r.tablename)) {
    if (heavyTables.includes(tbl)) {
      await client.query(`ALTER PUBLICATION supabase_realtime DROP TABLE ${tbl};`);
      console.log(`Dropped ${tbl} from supabase_realtime publication.`);
    }
  }

  // Check remaining count in audit_logs
  const remainingLogs = await client.query('SELECT COUNT(*) FROM audit_logs;');
  console.log(`Remaining active audit logs (< 7 days): ${remainingLogs.rows[0].count}`);

  await client.end();
  console.log('\nAll database optimizations applied successfully!');
}

run().catch(console.error);
