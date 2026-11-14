import fs from 'fs';
import path from 'path';

const migrationsDir = 'supabase/migrations';
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

let combined = '-- TOPSCORE LMS — CONSOLIDATED FULL PRODUCTION SCHEMA\n';
combined += '-- Generated for Clean Supabase Migration\n\n';

for (const file of files) {
  combined += `-- ====================================================\n`;
  combined += `-- Migration: ${file}\n`;
  combined += `-- ====================================================\n`;
  combined += fs.readFileSync(path.join(migrationsDir, file), 'utf8') + '\n\n';
}

fs.writeFileSync('supabase/clean_migration_bundle/consolidated_schema.sql', combined, 'utf8');
console.log(`Generated consolidated_schema.sql from ${files.length} migrations (${(combined.length / 1024).toFixed(1)} KB)`);
