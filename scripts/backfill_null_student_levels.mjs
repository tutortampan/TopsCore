import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.oclajpyumehpojepcczg.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '100%TopsCore',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function backfillAllNullLevels() {
  await client.connect();
  console.log('Connecting to database...');

  const before = await client.query(`
    SELECT count(*)::int as count 
    FROM students 
    WHERE level_id IS NULL AND deleted_at IS NULL;
  `);
  console.log(`Students with null level_id before: ${before.rows[0].count}`);

  const updateRes = await client.query(`
    UPDATE public.students s
    SET level_id = b.current_level_id, updated_at = NOW()
    FROM public.batches b
    WHERE s.batch_id = b.id
      AND s.level_id IS NULL
      AND b.current_level_id IS NOT NULL
      AND s.deleted_at IS NULL
    RETURNING s.id, s.name, b.name as batch_name;
  `);
  console.log(`✓ Backfilled level_id for ${updateRes.rowCount} students:`);
  console.table(updateRes.rows);

  const after = await client.query(`
    SELECT count(*)::int as count 
    FROM students 
    WHERE level_id IS NULL AND deleted_at IS NULL;
  `);
  console.log(`Students with null level_id after: ${after.rows[0].count}`);

  await client.end();
}

backfillAllNullLevels().catch(console.error);
