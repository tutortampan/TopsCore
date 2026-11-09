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

const BATCH_134_ID = '3e7288b7-a90e-4323-9b02-24e73991f0d7';
const LEVEL_2_ID = '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71';

async function check134() {
  await client.connect();
  const res = await client.query(`
    SELECT id, name, batch_id, level_id, is_active 
    FROM students 
    WHERE batch_id = $1 AND deleted_at IS NULL
    ORDER BY name ASC;
  `, [BATCH_134_ID]);
  console.log(`Batch 134 has ${res.rowCount} students:`);
  console.table(res.rows);

  // If any student in Batch 134 has null level_id, set it to Level 2 (Batch 134 level)
  const nullLevelStudents = res.rows.filter(r => !r.level_id);
  if (nullLevelStudents.length > 0) {
    console.log(`Backfilling level_id for ${nullLevelStudents.length} students in Batch 134 to Level 2...`);
    await client.query(`
      UPDATE students 
      SET level_id = $1, updated_at = NOW() 
      WHERE batch_id = $2 AND level_id IS NULL AND deleted_at IS NULL;
    `, [LEVEL_2_ID, BATCH_134_ID]);
    console.log('✓ Batch 134 students level_id backfilled.');
  }

  await client.end();
}

check134().catch(console.error);
