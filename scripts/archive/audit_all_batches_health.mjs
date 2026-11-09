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

async function auditBatches() {
  await client.connect();
  const res = await client.query(`
    SELECT 
      b.id, 
      b.name, 
      bl.name as batch_level,
      count(s.id)::int as total_students,
      count(s.id) FILTER (WHERE s.is_active = true)::int as active_students,
      count(s.id) FILTER (WHERE s.is_active = false)::int as inactive_students,
      count(s.id) FILTER (WHERE sl.level_number = 0)::int as alumni_students,
      count(s.id) FILTER (WHERE s.level_id IS NULL)::int as null_level_students
    FROM batches b
    LEFT JOIN levels bl ON b.current_level_id = bl.id
    LEFT JOIN students s ON s.batch_id = b.id AND s.deleted_at IS NULL
    LEFT JOIN levels sl ON s.level_id = sl.id
    WHERE b.deleted_at IS NULL
    GROUP BY b.id, b.name, bl.name
    ORDER BY b.name ASC;
  `);

  console.log('=== GLOBAL BATCH HEALTH AUDIT ===');
  console.table(res.rows);

  await client.end();
}

auditBatches().catch(console.error);
