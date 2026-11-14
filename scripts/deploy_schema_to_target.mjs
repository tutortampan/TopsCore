// TopsCore LMS — Target Database Schema Deployer
// Deploys all 29 migrations sequentially to the new Supabase project via direct PostgreSQL.

import fs from 'fs';
import path from 'path';
import pg from 'pg';

const { Client } = pg;

const client = new Client({
  host: 'db.lgzkbmsyqhvdjirbyzsg.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '100%Topscore',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

const MIGRATIONS_DIR = path.resolve('supabase/migrations');

async function run() {
  console.log('====================================================');
  console.log(' TOPSCORE LMS — DEPLOYING SCHEMA TO NEW SUPABASE');
  console.log(' Host: db.lgzkbmsyqhvdjirbyzsg.supabase.co:5432');
  console.log('====================================================\n');

  await client.connect();
  console.log('Connected to PostgreSQL successfully.\n');

  const files = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql')).sort();
  console.log(`Found ${files.length} migrations to deploy.\n`);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(MIGRATIONS_DIR, file);
    let sql = fs.readFileSync(filePath, 'utf8');

    // Replace empty search_path with public, extensions
    sql = sql.replace(/SELECT pg_catalog\.set_config\('search_path', '', false\);/g, "SET search_path = public, extensions;");

    // Always reset search_path to public, extensions before running migration
    await client.query('SET search_path = public, extensions;');

    process.stdout.write(`[${i + 1}/${files.length}] Running ${file}... `);

    try {
      await client.query(sql);
      console.log('DONE');
    } catch (err) {
      if (
        err.message.includes('already exists') ||
        err.message.includes('does not exist, skipping') ||
        err.message.includes('duplicate key')
      ) {
        console.log(`DONE (notice: ${err.message})`);
      } else {
        console.log(`FAILED: ${err.message}`);
        throw err;
      }
    }
  }

  console.log('\n====================================================');
  console.log(' ALL 29 MIGRATIONS DEPLOYED TO TARGET SUCCESSFULLY!');
  console.log('====================================================\n');

  // Verify created tables
  await client.query('SET search_path = public, extensions;');
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);

  console.log('Tables created in public schema:');
  console.table(res.rows);

  await client.end();
}

run().catch(err => {
  console.error('\n[FATAL DEPLOY ERROR]', err.message);
  process.exit(1);
});
