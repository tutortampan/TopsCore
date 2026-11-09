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

const CEC_INSTITUTION_ID = 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447';
const CAMP_PROGRAM_ID = '11deb53c-434a-44b0-83ca-1cc9b239cab3';

async function runMigration() {
  await client.connect();
  console.log('Connected to database. Running Phase 5 & 6 schema migrations...');

  // 1. Update levels table: Level 0 -> Alumni (Completed)
  console.log('\n[1] Updating levels table: Level 0 to Alumni...');
  await client.query(`
    UPDATE public.levels 
    SET name = 'Alumni', description = 'Completed' 
    WHERE level_number = 0;
  `);
  console.log('  ✓ Level 0 updated to Alumni (Completed)');

  // 2. Add institution_id and program_id to vocabulary_vault
  console.log('\n[2] Adding institution_id and program_id columns to vocabulary_vault...');
  await client.query(`
    ALTER TABLE public.vocabulary_vault 
      ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES public.programs(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_vocab_vault_inst_prog 
      ON public.vocabulary_vault(institution_id, program_id);

    CREATE INDEX IF NOT EXISTS idx_vocab_vault_prog_level 
      ON public.vocabulary_vault(program_id, target_level);
  `);
  console.log('  ✓ Columns & indexes added to vocabulary_vault');

  // 3. Attribute existing vocabulary_vault rows to CEC and Camp
  console.log('\n[3] Attributing existing vocabulary_vault records to CEC & Camp...');
  const attrRes = await client.query(`
    UPDATE public.vocabulary_vault 
    SET institution_id = $1, program_id = $2 
    WHERE institution_id IS NULL OR program_id IS NULL;
  `, [CEC_INSTITUTION_ID, CAMP_PROGRAM_ID]);
  console.log(`  ✓ Attributed ${attrRes.rowCount} vocabulary_vault rows to CEC & Camp`);

  // 4. Add Skor F (Forgiven) and Remedial support columns to attempts table
  console.log('\n[4] Adding is_forgiven and is_remedial columns to attempts table...');
  await client.query(`
    ALTER TABLE public.attempts 
      ADD COLUMN IF NOT EXISTS is_forgiven BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS forgiven_reason TEXT,
      ADD COLUMN IF NOT EXISTS forgiven_by UUID,
      ADD COLUMN IF NOT EXISTS forgiven_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS is_remedial BOOLEAN DEFAULT false;
  `);
  console.log('  ✓ Columns added to attempts');

  // 5. Reload PostgREST schema cache
  console.log('\n[5] Reloading PostgREST schema cache...');
  await client.query(`NOTIFY pgrst, 'reload schema';`);
  console.log('  ✓ NOTIFY pgrst dispatched');

  // 6. Verify updated levels
  const lvlRes = await client.query(`SELECT id, name, level_number, description FROM public.levels ORDER BY level_number;`);
  console.log('\nUpdated levels table:');
  console.table(lvlRes.rows);

  // 7. Verify vocabulary_vault counts
  const vaultRes = await client.query(`
    SELECT institution_id, program_id, target_level, category, count(*) 
    FROM public.vocabulary_vault 
    GROUP BY institution_id, program_id, target_level, category;
  `);
  console.log('\nUpdated vocabulary_vault distribution:');
  console.table(vaultRes.rows);

  await client.end();
  console.log('\n✅ Phase 5 & 6 Schema Migration Complete!');
}

runMigration().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});
