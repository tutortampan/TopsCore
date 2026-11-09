import { getSupabase } from '../js/supabase.js';

global.window = {
  location: { hostname: 'cloud' },
  localStorage: { getItem: () => null, setItem: () => {} },
  addEventListener: () => {},
  removeEventListener: () => {}
};

console.log('======================================================');
console.log('DIAGNOSTICS & SYSTEM HEALTH AUDIT');
console.log('======================================================');

const sb = await getSupabase();

const tablesToCheck = [
  'institutions',
  'programs',
  'batches',
  'classes',
  'levels',
  'students',
  'tests',
  'attempts',
  'attempt_answers',
  'vocabulary_vault',
  'theme_program_assignments',
  'site_settings',
  'audit_logs'
];

let errors = 0;

for (const tbl of tablesToCheck) {
  try {
    const { count, error } = await sb.from(tbl).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`  ❌ Table [${tbl}]: Query Error -> ${error.message} (${error.code})`);
      errors++;
    } else {
      console.log(`  ✓ Table [${tbl}]: OK (Rows: ${count ?? 0})`);
    }
  } catch (err) {
    console.error(`  ❌ Table [${tbl}]: Exception -> ${err.message}`);
    errors++;
  }
}

// Check Active Batches & Current Level
console.log('\n[CHECK: Batches & Level Alignment]');
const { data: batches, error: bErr } = await sb.from('batches').select('id, name, program_id, current_level_id, is_active').eq('is_active', true);
if (bErr) {
  console.error('  ❌ Batches fetch error:', bErr.message);
  errors++;
} else {
  console.log(`  ✓ Active Batches verified (${batches.length} active batches)`);
}

// Check Site Settings
console.log('\n[CHECK: Site Settings]');
const { data: settings, error: sErr } = await sb.from('site_settings').select('*').limit(5);
if (sErr) {
  console.error('  ❌ Site Settings fetch error:', sErr.message);
  errors++;
} else {
  console.log(`  ✓ Site Settings accessible (${settings.length} records)`);
}

console.log('\n======================================================');
if (errors === 0) {
  console.log('🎉 SYSTEM HEALTH AUDIT: 100% HEALTHY (0 ERRORS DETECTED)');
} else {
  console.error(`❌ SYSTEM HEALTH AUDIT: ${errors} ERRORS DETECTED!`);
  process.exit(1);
}
console.log('======================================================');

