// Apply migration: add is_manual_override column to attempts
import { getSupabase } from '../js/supabase.js';

const sb = await getSupabase();

// Execute the migration via RPC (raw SQL)
const { error } = await sb.rpc('exec_sql', {
  sql: `ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;`
}).catch(() => ({ error: { message: 'rpc not available' } }));

if (error) {
  // Try direct approach - Supabase anon can't run DDL, needs service_role
  console.log('⚠️  Cannot run DDL via anon key — please run this in Supabase SQL Editor:');
  console.log('');
  console.log('ALTER TABLE public.attempts ADD COLUMN IF NOT EXISTS is_manual_override BOOLEAN DEFAULT FALSE;');
  console.log('');
  console.log('CREATE INDEX IF NOT EXISTS idx_attempts_is_manual_override');
  console.log('  ON public.attempts(is_manual_override)');
  console.log('  WHERE is_manual_override = TRUE;');
} else {
  console.log('✅ Migration applied successfully!');
}

