import pg from 'pg';
const { Client } = pg;

const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD;

if (!dbPassword) {
  console.error('Error: SUPABASE_DB_PASSWORD or PGPASSWORD environment variable is required.');
  process.exit(1);
}

const CLOUD_CONFIG = {
  host: process.env.SUPABASE_DB_HOST || 'db.oclajpyumehpojepcczg.supabase.co',
  port: parseInt(process.env.SUPABASE_DB_PORT || '5432', 10),
  user: process.env.SUPABASE_DB_USER || 'postgres',
  password: dbPassword,
  database: process.env.SUPABASE_DB_NAME || 'postgres',
  ssl: { rejectUnauthorized: false }
};

const INDEX_QUERIES = [
  {
    name: 'idx_attempts_student_test',
    sql: 'CREATE INDEX IF NOT EXISTS idx_attempts_student_test ON public.attempts(student_id, test_id);'
  },
  {
    name: 'idx_attempt_answers_attempt_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON public.attempt_answers(attempt_id);'
  },
  {
    name: 'idx_students_batch_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_students_batch_id ON public.students(batch_id);'
  },
  {
    name: 'idx_students_program_id',
    sql: 'CREATE INDEX IF NOT EXISTS idx_students_program_id ON public.students(program_id);'
  }
];

async function applyIndexes() {
  console.log('Connecting to Supabase Cloud PostgreSQL...');
  const client = new Client(CLOUD_CONFIG);

  try {
    await client.connect();
    console.log('Connected to database successfully.');

    for (const item of INDEX_QUERIES) {
      console.log(`Applying: ${item.name}...`);
      await client.query(item.sql);
      console.log(`  ✅ Applied: ${item.name}`);
    }

    console.log('\nVerifying indexes in pg_indexes:');
    const res = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname IN ('idx_attempts_student_test', 'idx_attempt_answers_attempt_id', 'idx_students_batch_id', 'idx_students_program_id')
      ORDER BY tablename, indexname;
    `);

    console.table(res.rows);

    if (res.rows.length === 4) {
      console.log('🎉 All 4 performance indexes verified successfully!');
    } else {
      console.warn(`⚠️ Warning: Expected 4 indexes, found ${res.rows.length}`);
    }
  } catch (err) {
    console.error('Database error:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyIndexes();
