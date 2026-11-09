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

const BATCH_132_ID = '2bb3f43a-d618-4f8a-9a98-31c157ff7a30';
const BATCH_134_ID = '3e7288b7-a90e-4323-9b02-24e73991f0d7';
const LEVEL_3_ID = '51589e1a-d96e-496e-92a3-d9d350483555';

async function main() {
  await client.connect();
  console.log('Connected to Supabase PostgreSQL database.');

  // Insert audit log for Batch 132 fix
  await client.query(`
    INSERT INTO public.audit_logs (
      actor_role, action, entity_type, entity_id, old_value, new_value, created_at
    ) VALUES (
      'admin',
      'BATCH_STUDENTS_REACTIVATED',
      'batch',
      $1,
      jsonb_build_object('level_id', 'b70a0ea2-785d-4291-9adf-a4cbd7a2c9a2 (Alumni)', 'is_active', false),
      jsonb_build_object('level_id', $2::text, 'is_active', true, 'count', 7),
      NOW()
    );
  `, [BATCH_132_ID, LEVEL_3_ID]);
  console.log('  ✓ Audit log recorded for Batch 132 student reactivation.');

  // Verification: Batch 132 students
  console.log('\n[1] Verification: Batch 132 students:');
  const verify132 = await client.query(`
    SELECT s.id, s.name, b.name as batch_name, l.name as level_name, l.level_number, s.is_active
    FROM students s
    JOIN batches b ON s.batch_id = b.id
    JOIN levels l ON s.level_id = l.id
    WHERE s.batch_id = $1 AND s.deleted_at IS NULL
    ORDER BY s.name ASC;
  `, [BATCH_132_ID]);
  console.table(verify132.rows);

  // Verification: Batch 134 students
  console.log('\n[2] Verification: Batch 134 students:');
  const verify134 = await client.query(`
    SELECT s.id, s.name, b.name as batch_name, l.name as level_name, l.level_number, s.is_active
    FROM students s
    JOIN batches b ON s.batch_id = b.id
    JOIN levels l ON s.level_id = l.id
    WHERE s.batch_id = $1 AND s.deleted_at IS NULL
    ORDER BY s.name ASC;
  `, [BATCH_134_ID]);
  console.table(verify134.rows);

  await client.end();
  console.log('\nVerification complete!');
}

main().catch(err => {
  console.error('Script failed:', err);
  process.exit(1);
});
