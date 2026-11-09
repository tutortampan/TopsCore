import fs from 'fs';

const migrationSql = fs.readFileSync('supabase/migrations/20261012_emergency_submit_rpc.sql', 'utf8');
let schemaSql = fs.readFileSync('supabase/schema.sql', 'utf8');

if (!schemaSql.includes('emergency_submit_attempt')) {
  schemaSql = schemaSql.trimEnd() + '\n\n' + migrationSql.trim() + '\n';
  fs.writeFileSync('supabase/schema.sql', schemaSql, 'utf8');
  console.log('Appended emergency_submit_attempt to supabase/schema.sql');
} else {
  console.log('emergency_submit_attempt already present in schema.sql');
}
